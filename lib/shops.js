// The five Lithuanian shops the picker may recommend from (same set as Cellar).
export const SHOPS = [
  { id: "vynoteka", name: "Vynoteka", host: "vynoteka.lt" },
  { id: "vynokambarys", name: "Vynokambarys", host: "vynokambarys.lt" },
  { id: "vynomeka", name: "Vynomeka", host: "vynomeka.lt" },
  { id: "rimi", name: "Rimi", host: "rimi.lt" },
  { id: "iki", name: "IKI", host: "iki.lt" },
];

export function shopFor(url) {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.port
    )
      return null;
    return (
      SHOPS.find(
        (shop) =>
          parsed.hostname === shop.host ||
          parsed.hostname === `www.${shop.host}`,
      ) ?? null
    );
  } catch {
    return null;
  }
}
