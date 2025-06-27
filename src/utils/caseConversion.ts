// Convert camelCase or PascalCase to snake_case
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, letter => `_${letter.toLowerCase()}`)
    .replace(/^_/, '');
}

// Convert all keys in an object (recursively) to snake_case
export function convertKeysToSnake(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => convertKeysToSnake(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      result[toSnakeCase(key)] = convertKeysToSnake(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

// Convert snake_case to camelCase
export function toCamelCase(str: string): string {
  return str.replace(/([-_][a-z])/g, group =>
    group.toUpperCase()
      .replace('-', '')
      .replace('_', '')
  );
}

// Convert all keys in an object (recursively) to camelCase
export function convertKeysToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => convertKeysToCamel(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      result[toCamelCase(key)] = convertKeysToCamel(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}
