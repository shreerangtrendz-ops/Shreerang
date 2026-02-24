# Performance Optimization

## Database
*   **Indexing**: Ensure `finish_fabric_designs` has an index on `status` and `created_at` for faster design retrieval.
*   **Query Limit**: Always use `LIMIT` in bot queries (e.g., `LIMIT 5`) to prevent flooding the chat.

## n8n
*   **Execution Data**: Turn off "Save Data for Successful Executions" to save disk space and DB I/O on the n8n server.
*   **Concurrency**: If message volume is high, consider scaling n8n workers.

## Media
*   **Compression**: Ensure images uploaded to Supabase Storage are compressed. Sending 5MB+ images via WhatsApp is slow and data-intensive.
*   **CDNs**: Use Supabase's CDN URLs for image links.