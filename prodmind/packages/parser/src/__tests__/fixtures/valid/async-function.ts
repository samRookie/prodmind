export async function fetchData(url: string): Promise<string> {
  const response = await fetch(url);
  return response.text();
}

async function internalProcess(data: string): Promise<void> {
  await Promise.resolve(data);
}

export const handler = async (event: unknown): Promise<void> => {
  await Promise.resolve(event);
};
