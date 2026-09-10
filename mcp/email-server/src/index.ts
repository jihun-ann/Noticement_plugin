import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import nodemailer from "nodemailer";

const server = new McpServer({ name: "noticement-email", version: "0.1.0" });

function loadTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "Missing SMTP config: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (and optionally SMTP_FROM) in the environment."
    );
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

server.registerTool(
  "send_email",
  {
    title: "Send email",
    description: "Send an HTML email via SMTP.",
    inputSchema: {
      to: z.string().email().describe("Recipient email address"),
      subject: z.string(),
      html: z.string().describe("Email body as HTML"),
    },
  },
  async ({ to, subject, html }) => {
    try {
      const transporter = loadTransporter();
      const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
      const info = await transporter.sendMail({ from, to, subject, html });
      return {
        content: [
          { type: "text" as const, text: `Sent (messageId: ${info.messageId})` },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          { type: "text" as const, text: err instanceof Error ? err.message : String(err) },
        ],
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
