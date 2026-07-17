type QueuedTask<T> = {
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

/**
 * Serializes async work so only `concurrency` tasks run at once.
 * Gemini API calls use concurrency 1 to avoid 429 floods from parallel requests.
 */
export class RequestQueue {
  private readonly pending: QueuedTask<unknown>[] = [];
  private activeCount = 0;

  constructor(private readonly concurrency = 1) {}

  enqueue<T>(run: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.push({
        run,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.drain();
    });
  }

  private drain(): void {
    while (this.activeCount < this.concurrency && this.pending.length > 0) {
      const item = this.pending.shift();
      if (!item) return;

      this.activeCount += 1;
      void item
        .run()
        .then(item.resolve)
        .catch(item.reject)
        .finally(() => {
          this.activeCount -= 1;
          this.drain();
        });
    }
  }
}

/** Global queue for Gemini API — one in-flight request at a time. */
export const geminiRequestQueue = new RequestQueue(1);
