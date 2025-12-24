import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for managing an undo/redo stack
 * Supports bulk operations and configurable max history
 * @param {Object} options - Configuration options
 * @param {number} options.maxHistory - Maximum number of operations to track (default: 50)
 * @returns {{ canUndo, canRedo, pushOperation, undo, redo, clearHistory }}
 */
export const useUndoStack = ({ maxHistory = 50 } = {}) => {
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const processingRef = useRef(false);

  /**
   * Push an operation to the undo stack
   * @param {Object} operation - The operation to push
   * @param {string} operation.type - Type of operation (e.g., 'delete', 'update', 'create')
   * @param {string} operation.description - Human-readable description
   * @param {Function} operation.undo - Function to undo the operation
   * @param {Function} operation.redo - Function to redo the operation
   * @param {any} operation.data - Any data needed for undo/redo
   */
  const pushOperation = useCallback((operation) => {
    setUndoStack(prev => {
      const newStack = [...prev, {
        ...operation,
        id: Date.now() + Math.random(),
        timestamp: Date.now()
      }];
      // Limit stack size
      if (newStack.length > maxHistory) {
        return newStack.slice(-maxHistory);
      }
      return newStack;
    });
    // Clear redo stack when new operation is pushed
    setRedoStack([]);
  }, [maxHistory]);

  /**
   * Push multiple operations as a single undoable action
   * @param {Array} operations - Array of operations
   * @param {string} description - Description for the batch
   */
  const pushBatchOperation = useCallback((operations, description) => {
    pushOperation({
      type: 'batch',
      description,
      data: operations,
      undo: async () => {
        // Undo in reverse order
        for (let i = operations.length - 1; i >= 0; i--) {
          await operations[i].undo?.();
        }
      },
      redo: async () => {
        // Redo in original order
        for (const op of operations) {
          await op.redo?.();
        }
      }
    });
  }, [pushOperation]);

  /**
   * Undo the last operation
   * @returns {Object|null} The undone operation, or null if nothing to undo
   */
  const undo = useCallback(async () => {
    if (undoStack.length === 0 || processingRef.current) return null;

    processingRef.current = true;
    try {
      const operation = undoStack[undoStack.length - 1];

      // Execute undo
      await operation.undo?.();

      // Move from undo to redo stack
      setUndoStack(prev => prev.slice(0, -1));
      setRedoStack(prev => [...prev, operation]);

      return operation;
    } finally {
      processingRef.current = false;
    }
  }, [undoStack]);

  /**
   * Redo the last undone operation
   * @returns {Object|null} The redone operation, or null if nothing to redo
   */
  const redo = useCallback(async () => {
    if (redoStack.length === 0 || processingRef.current) return null;

    processingRef.current = true;
    try {
      const operation = redoStack[redoStack.length - 1];

      // Execute redo
      await operation.redo?.();

      // Move from redo to undo stack
      setRedoStack(prev => prev.slice(0, -1));
      setUndoStack(prev => [...prev, operation]);

      return operation;
    } finally {
      processingRef.current = false;
    }
  }, [redoStack]);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  /**
   * Get the last operation description (for UI)
   */
  const getLastOperationDescription = useCallback(() => {
    if (undoStack.length === 0) return null;
    return undoStack[undoStack.length - 1].description;
  }, [undoStack]);

  /**
   * Get the last undone operation description (for UI)
   */
  const getLastUndoneDescription = useCallback(() => {
    if (redoStack.length === 0) return null;
    return redoStack[redoStack.length - 1].description;
  }, [redoStack]);

  return {
    canUndo: undoStack.length > 0 && !processingRef.current,
    canRedo: redoStack.length > 0 && !processingRef.current,
    undoCount: undoStack.length,
    redoCount: redoStack.length,
    pushOperation,
    pushBatchOperation,
    undo,
    redo,
    clearHistory,
    getLastOperationDescription,
    getLastUndoneDescription
  };
};

export default useUndoStack;
