import { tryCall } from "../util.ts";

function isPrivateIpv4(addr: string): boolean {
  // 10.0.0.0/8
  if (addr.startsWith("10.")) return true;
  // 172.16.0.0/12
  if (addr.startsWith("172.")) {
    const parts = addr.split(".");
    const second = Number(parts[1] ?? "");
    return Number.isFinite(second) && second >= 16 && second <= 31;
  }
  // 192.168.0.0/16
  if (addr.startsWith("192.168.")) return true;
  return false;
}

/**
 * Best-effort private IP discovery.
 * Prefers RFC1918 IPv4, else first non-loopback IPv4.
 */
export function discoverPrivateIp(): string | undefined {
  const ifaces = tryCall(() => Deno.networkInterfaces());
  if (!ifaces || ifaces.length === 0) return undefined;

  let firstNonLoopback: string | undefined;

  for (const nic of ifaces) {
    const addr = nic.address;
    const fam = String(nic.family ?? "");
    if (fam !== "IPv4") continue;
    if (addr.startsWith("127.") || addr === "0.0.0.0") continue;

    if (!firstNonLoopback) firstNonLoopback = addr;
    if (isPrivateIpv4(addr)) return addr;
  }

  return firstNonLoopback;
}
