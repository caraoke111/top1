// Publicación en Instagram (Graph API de Meta) desde el servidor.
// El token vive en INSTAGRAM_TOKEN (env), nunca se expone al cliente.
// Las cuentas en INSTAGRAM_ACCOUNTS (JSON): [{"igUserId":"...","handle":"..."}]

const BASE = "https://graph.facebook.com";
const V = process.env.INSTAGRAM_API_VERSION || "v23.0";

export interface IgAccount {
  igUserId: string;
  handle: string;
  token?: string; // token permanente de la página (opcional; si no, usa el global)
}

export function getIgAccounts(): IgAccount[] {
  try {
    const arr = JSON.parse(process.env.INSTAGRAM_ACCOUNTS || "[]");
    return Array.isArray(arr) ? arr.filter((a) => a && a.igUserId) : [];
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function call(ruta: string, method: "GET" | "POST", params: Record<string, any>, tk?: string) {
  const token = tk || process.env.INSTAGRAM_TOKEN;
  if (!token) throw new Error("Falta token de Instagram");
  const url = new URL(`${BASE}/${V}/${ruta}`);
  const body = new URLSearchParams();
  body.set("access_token", token);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (method === "GET") url.searchParams.set(k, String(v));
    else body.set(k, String(v));
  }
  if (method === "GET") url.searchParams.set("access_token", token);
  const res = await fetch(url, { method, body: method === "GET" ? undefined : body });
  const data = await res.json().catch(() => ({}));
  if (data.error) throw new Error(`${data.error.message} (code ${data.error.code})`);
  return data;
}

async function crearContenedor(
  igUserId: string,
  imageUrl: string,
  caption: string,
  userTags?: { username: string; x: number; y: number }[],
  tk?: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: Record<string, any> = { image_url: imageUrl, caption };
  if (userTags && userTags.length) params.user_tags = JSON.stringify(userTags);
  const r = await call(`${igUserId}/media`, "POST", params, tk);
  return r.id as string;
}

async function esperarListo(contenedorId: string, tk?: string) {
  for (let i = 0; i < 20; i++) {
    const r = await call(contenedorId, "GET", { fields: "status_code" }, tk);
    if (r.status_code === "FINISHED" || r.status_code === "PUBLISHED") return;
    if (r.status_code === "ERROR") throw new Error("Instagram rechazó la imagen");
    await new Promise((s) => setTimeout(s, 2500));
  }
}

// Postea una imagen a una cuenta. Si la etiqueta falla (@ inválido), reintenta
// sin etiqueta (red de seguridad). Devuelve el id del post.
export async function postImageToAccount(input: {
  igUserId: string;
  imageUrl: string;
  caption: string;
  userTags?: { username: string; x: number; y: number }[];
  token?: string;
}): Promise<string> {
  const tk = input.token;
  let contenedorId: string;
  try {
    contenedorId = await crearContenedor(input.igUserId, input.imageUrl, input.caption, input.userTags, tk);
  } catch (e) {
    if (input.userTags && input.userTags.length) {
      contenedorId = await crearContenedor(input.igUserId, input.imageUrl, input.caption, undefined, tk);
    } else {
      throw e;
    }
  }
  await esperarListo(contenedorId, tk);
  const pub = await call(`${input.igUserId}/media_publish`, "POST", { creation_id: contenedorId }, tk);
  return pub.id as string;
}
