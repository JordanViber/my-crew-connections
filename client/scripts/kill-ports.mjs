import { execFileSync, spawnSync } from "node:child_process";

const ports = process.argv
  .slice(2)
  .map((value) => Number.parseInt(value, 10))
  .filter((value) => Number.isInteger(value) && value > 0);

if (ports.length === 0) {
  console.error("kill-ports: provide at least one TCP port.");
  process.exit(1);
}

function unique(values) {
  return [...new Set(values)];
}

function getWindowsPids(port) {
  const output = execFileSync("netstat", ["-ano", "-p", "tcp"], {
    encoding: "utf8",
  });

  return unique(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => line.includes(`:${port}`))
      .filter((line) => /\sLISTENING\s/i.test(line))
      .map((line) => line.split(/\s+/).at(-1))
      .filter((pid) => pid && /^\d+$/.test(pid) && pid !== String(process.pid)),
  );
}

function getUnixPids(port) {
  const result = spawnSync("lsof", ["-ti", `tcp:${port}`], {
    encoding: "utf8",
  });

  if (result.status !== 0 && !result.stdout) {
    return [];
  }

  return unique(
    result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((pid) => pid && /^\d+$/.test(pid) && pid !== String(process.pid)),
  );
}

function getPidsForPort(port) {
  if (process.platform === "win32") {
    return getWindowsPids(port);
  }

  return getUnixPids(port);
}

function killPid(pid) {
  if (process.platform === "win32") {
    const result = spawnSync("taskkill", ["/PID", pid, "/F"], { encoding: "utf8" });
    return result.status === 0;
  }

  const result = spawnSync("kill", ["-9", pid], { encoding: "utf8" });
  return result.status === 0;
}

const failedPorts = [];

for (const port of ports) {
  const pids = getPidsForPort(port);

  if (pids.length === 0) {
    console.log(`kill-ports: port ${port} is already free.`);
    continue;
  }

  console.log(`kill-ports: clearing port ${port} held by PID${pids.length === 1 ? "" : "s"} ${pids.join(", ")}.`);

  for (const pid of pids) {
    if (!killPid(pid)) {
      failedPorts.push({ port, pid });
    }
  }

  const remaining = getPidsForPort(port);

  if (remaining.length > 0) {
    remaining.forEach((pid) => failedPorts.push({ port, pid }));
  }
}

if (failedPorts.length > 0) {
  const details = failedPorts.map(({ port, pid }) => `${port}:${pid}`).join(", ");
  console.error(`kill-ports: failed to free required port bindings (${details}).`);
  process.exit(1);
}
