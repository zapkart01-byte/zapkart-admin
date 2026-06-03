/**
 * Races a promise against a timeout so UI loading states cannot hang indefinitely.
 */
export async function queryWithTimeout(promise, timeoutMs = 12000) {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('Request timed out. Please try again.')),
      timeoutMs
    )
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timeoutId)
  }
}
