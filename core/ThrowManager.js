class ThrowManager {
  constructor() {
    this.history = []; // Array of Throw objects sorted by timestamp
    this.idMap = new Map(); // Map for O(1) lookup by ID
  }

  /**
   * Add a new Throw to the history (auto-updates if ID already exists)
   * @param {Throw} throwObj - The Throw object to add
   * @returns {boolean} - True if added/updated successfully
   */
  add(throwObj) {
    if (!throwObj || !throwObj.id) {
      throw new Error("Invalid Throw object: missing id");
    }

    if (this.idMap.has(throwObj.id)) {
      // Auto-update if ID already exists
      return this.update(throwObj.id, throwObj);
    }

    // Find insertion point to maintain timestamp order
    const insertIndex = this.findInsertionIndex(throwObj.timestamp);

    // Insert into history array
    this.history.splice(insertIndex, 0, throwObj);

    // Add to map for fast lookup
    this.idMap.set(throwObj.id, throwObj);

    return true;
  }

  /**
   * Insert a Throw at a specific position (based on timestamp ordering)
   * Auto-updates if ID already exists
   * @param {Throw} throwObj - The Throw object to insert
   * @returns {boolean} - True if inserted/updated successfully
   */
  insert(throwObj) {
    return this.add(throwObj); // Same as add - maintains timestamp order and auto-updates
  }

  /**
   * Delete a Throw by its ID
   * @param {string} id - The ID of the Throw to delete
   * @returns {boolean} - True if deleted successfully, false if not found
   */
  delete(id) {
    const throwObj = this.idMap.get(id);
    if (!throwObj) {
      return false; // Not found
    }

    // Remove from history array
    const index = this.history.indexOf(throwObj);
    if (index !== -1) {
      this.history.splice(index, 1);
    }

    // Remove from map
    this.idMap.delete(id);

    return true;
  }

  /**
   * Get a Throw by its ID
   * @param {string} id - The ID of the Throw to retrieve
   * @returns {Throw|undefined} - The Throw object or undefined if not found
   */
  getById(id) {
    return this.idMap.get(id);
  }

  /**
   * Get the complete history array
   * @returns {Throw[]} - Array of all Throw objects sorted by timestamp
   */
  getHistory() {
    return [...this.history]; // Return a copy to prevent external modification
  }

  /**
   * Get the number of Throws in the history
   * @returns {number} - Count of Throw objects
   */
  getCount() {
    return this.history.length;
  }

  /**
   * Check if a Throw with the given ID exists
   * @param {string} id - The ID to check
   * @returns {boolean} - True if exists, false otherwise
   */
  exists(id) {
    return this.idMap.has(id);
  }

  /**
   * Clear all Throws from the history
   */
  clear() {
    this.history = [];
    this.idMap.clear();
  }

  /**
   * Get Throws within a timestamp range
   * @param {number} startTime - Start timestamp
   * @param {number} endTime - End timestamp
   * @returns {Throw[]} - Array of Throw objects within the range
   */
  getByTimeRange(startTime, endTime) {
    return this.history.filter((throwObj) => throwObj.timestamp >= startTime && throwObj.timestamp <= endTime);
  }

  /**
   * Find the insertion index to maintain timestamp order
   * @private
   * @param {number} timestamp - The timestamp to find insertion point for
   * @returns {number} - The index where the object should be inserted
   */
  findInsertionIndex(timestamp) {
    if (!timestamp) {
      return this.history.length; // Add at end if no timestamp
    }

    // Binary search for insertion point
    let left = 0;
    let right = this.history.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.history[mid].timestamp <= timestamp) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return left;
  }

  /**
   * Update an existing Throw (removes and re-adds to maintain order)
   * @param {string} id - The ID of the Throw to update
   * @param {Throw} updatedThrowObj - The updated Throw object
   * @returns {boolean} - True if updated successfully, false if not found
   */
  update(id, updatedThrowObj) {
    if (!this.exists(id)) {
      return false;
    }

    if (updatedThrowObj.id !== id) {
      throw new Error("Updated object must have the same ID");
    }

    this.delete(id);
    return this.add(updatedThrowObj);
  }
}
