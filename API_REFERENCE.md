# 📚 API Reference

## WhatsApp Service (`src/services/WhatsAppService.js`)

### `sendMessage(to, message, type)`
Sends a message to a customer.
*   **to**: `string` - Phone number with country code.
*   **message**: `string` - Text content or media URL.
*   **type**: `'text' | 'image' | 'document'`
*   **Returns**: `Promise<{ messaging_product: "whatsapp", contacts: [...], messages: [...] }>`

### `fetchConversations()`
Gets active chats.
*   **Returns**: `Promise<Conversation[]>`

---

## BunnyNet Service (`src/services/BunnyNetService.js`)

### `uploadFile(file)`
Uploads a file to the storage zone.
*   **file**: `File` object.
*   **Returns**: `Promise<{ fileName, cdnUrl, fileSize }>`

### `deleteFile(fileName)`
Removes file from storage.
*   **fileName**: `string`

---

## Design Service
*Internal Logic in components*

### `DesignUploadComponent`
*   **Input**: Dragged File.
*   **Process**: Calls `BunnyNetService.uploadFile`.
*   **Output**: Returns design metadata object to parent form.