async function report() {
  try {
    const response = await fetch('http://localhost:3000/health');
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
    process.exit(data.success ? 0 : 1);
  } catch (err) {
    console.error('Health check failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

report();
