export class StorageError extends Error {
  constructor(
    message: string,
    public readonly operation: 'read' | 'write',
    public readonly key: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class QuotaExceededError extends StorageError {
  constructor(key: string, originalError: Error) {
    super(
      'Storage quota exceeded. Please free up some space by removing unused repositories.',
      'write',
      key,
      originalError
    );
    this.name = 'QuotaExceededError';
  }
}

export class StorageUnavailableError extends StorageError {
  constructor(operation: 'read' | 'write', key: string, originalError: Error) {
    super(
      'Local storage is not available. This may happen in private browsing mode.',
      operation,
      key,
      originalError
    );
    this.name = 'StorageUnavailableError';
  }
}

export class InvalidDataError extends StorageError {
  constructor(key: string, originalError: Error) {
    super(
      'The stored data is corrupted or in an invalid format.',
      'read',
      key,
      originalError
    );
    this.name = 'InvalidDataError';
  }
} 