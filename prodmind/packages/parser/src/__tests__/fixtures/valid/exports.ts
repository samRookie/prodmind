function helper(): number {
  return 42;
}

export default helper;

export const named = 'value';

export { helper as renamedHelper };
