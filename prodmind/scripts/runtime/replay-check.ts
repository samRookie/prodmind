async function check() {
  try {
    const envEnabled = process.env.REPLAY_ENABLED !== 'false';
    console.log(`Replay enabled: ${envEnabled}`);
    console.log(`Replay storage: ${process.env.REPLAY_STORAGE_PATH ?? 'default'}`);
    process.exit(envEnabled ? 0 : 1);
  } catch (err) {
    console.error('Replay check failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

check();
