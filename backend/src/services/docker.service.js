import Docker from 'dockerode';
import { env } from '../config/env.js';

// Auto-detect Docker socket: env override → Windows pipe → Unix socket
const socketPath =
  env.DOCKER_SOCKET ||
  (process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock');

const docker = new Docker({ socketPath });

// Verify Docker daemon is reachable at startup (non-fatal — labs just won't work)
docker.ping().then(() => {
  console.log('[Docker] Connected to daemon via', socketPath);
}).catch(() => {
  console.warn('[Docker] WARNING: cannot reach Docker daemon at', socketPath);
  console.warn('[Docker] Lab orchestration will fail until Docker is running.');
});

/**
 * Pull a Docker image only if it is not already present locally.
 * Local-only images (e.g. custom-built images never pushed to a registry)
 * are used as-is without attempting a pull, which would always fail.
 */
export async function pullImage(image, timeoutMs = 120_000) {
  // Check if image exists locally first
  const existsLocally = await imageExistsLocally(image);
  if (existsLocally) {
    console.log(`[Docker] Image "${image}" found locally — skipping pull`);
    return;
  }

  console.log(`[Docker] Pulling image "${image}" from registry…`);

  const pullPromise = new Promise((resolve, reject) => {
    docker.pull(image, (err, stream) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, (err2) => (err2 ? reject(err2) : resolve()));
    });
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Image pull timed out after ${timeoutMs / 1000}s — is "${image}" a local-only image that hasn't been built yet?`)), timeoutMs)
  );

  await Promise.race([pullPromise, timeoutPromise]);
  console.log(`[Docker] Pull complete: "${image}"`);
}

async function imageExistsLocally(image) {
  try {
    await docker.getImage(image).inspect();
    return true;
  } catch {
    return false;
  }
}

/**
 * Create and start a container for a lab session.
 * Returns { containerId, containerName, assignedPort }.
 */
export async function startContainer({ dockerImage, cpuLimit, memoryLimitMb, servicePort, containerName, flag }) {
  const container = await docker.createContainer({
    Image: dockerImage,
    name: containerName,
    Env: flag ? [`SESSION_FLAG=${flag}`] : [],
    ExposedPorts: { [`${servicePort}/tcp`]: {} },
    HostConfig: {
      PortBindings: { [`${servicePort}/tcp`]: [{ HostPort: '' }] }, // '' = auto-assign
      Memory: memoryLimitMb * 1024 * 1024,
      NanoCpus: Math.round(cpuLimit * 1e9),
      NetworkMode: 'bridge',
      AutoRemove: false, // we manage removal on stop
    },
  });

  await container.start();

  const info = await container.inspect();
  const assignedPort = info.NetworkSettings.Ports[`${servicePort}/tcp`]?.[0]?.HostPort;

  return { containerId: container.id, containerName, assignedPort };
}

/**
 * Stop and remove a container. Tolerates already-stopped or already-removed containers.
 */
export async function stopContainer(containerId) {
  try {
    const c = docker.getContainer(containerId);
    await c.stop({ t: 5 }).catch((err) => {
      if (err.statusCode !== 304 && err.statusCode !== 404) throw err;
    });
    await c.remove({ force: true }).catch((err) => {
      if (err.statusCode !== 404) throw err;
    });
  } catch (err) {
    if (err.statusCode !== 404) throw err;
  }
}

/**
 * Fetch last N lines from a container's stdout+stderr.
 * Docker log frames are prefixed with an 8-byte header: [stream, 0, 0, 0, size(4)]
 */
export async function getContainerLogs(containerId, tail = 100) {
  const container = docker.getContainer(containerId);
  const buffer = await container.logs({ stdout: true, stderr: true, tail, follow: false });
  if (!Buffer.isBuffer(buffer)) return String(buffer);
  return demuxLogs(buffer);
}

/**
 * Returns true if the container exists and is currently running.
 */
export async function isContainerRunning(containerId) {
  try {
    const info = await docker.getContainer(containerId).inspect();
    return info.State.Running === true;
  } catch {
    return false;
  }
}

// Strip the 8-byte Docker multiplexed stream headers from a log buffer.
function demuxLogs(buffer) {
  let result = '';
  let offset = 0;
  while (offset + 8 <= buffer.length) {
    const frameSize = buffer.readUInt32BE(offset + 4);
    offset += 8;
    if (frameSize > 0 && offset + frameSize <= buffer.length) {
      result += buffer.slice(offset, offset + frameSize).toString('utf8');
    }
    offset += frameSize;
  }
  return result;
}
