# Bulk Import Performance Guide

## Benchmarks
| Batch Size | Time (Approx) | Success Rate |
| :--- | :--- | :--- |
| 100 items | 5 seconds | High |
| 500 items | 20 seconds | High |
| 1000 items | 45 seconds | Medium |
| 5000 items | 3+ minutes | Low (Risk of timeout) |

## Optimization Tips
1.  **Client-Side**:
    *   Close other browser tabs.
    *   Ensure Excel file has no formatting/colors (Plain Data).
2.  **Network**:
    *   Use a stable connection. Upload speed impacts the initial file parsing.
3.  **Database**:
    *   Imports run in sequential batches. Avoid running 5 huge imports simultaneously across different users.

## Handling Large Imports (>10k)
**Do not** try to import 10,000 rows in one file.
*   **Strategy**: Split into 10 files of 1000 rows each.
*   **Reason**: Browser memory limits and API timeout limits (usually 60s).

## Memory Usage
*   The system parses the entire Excel file into browser memory.
*   A 5MB Excel file can take 50-100MB of RAM to process.