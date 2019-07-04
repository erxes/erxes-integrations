const messages = `
  query conversationMessages($conversationId: String!) {
    conversationMessages(conversationId: $conversationId) {
      _id
      conversationId
      erxesApiId
      createdAt
      labelIds
      subject
      body
      to
      cc
      bcc
      attachments {
        mimeType
        size
        data
        filename
      }
      references
      headerId
      from
      reply
      messageId
      textHtml
      textPlain
      threadId
    }
  }
`;

export default { messages };
