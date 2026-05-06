import { PageHeader } from "@/components/layout/page-header";
import { ChatPanel } from "@/components/assistant/chat-panel";

export default function AsistentePage() {
  return (
    <>
      <PageHeader
        title="Asistente financiero"
        subtitle="Respuestas con datos reales · sin alucinaciones · cada consulta queda registrada"
      />
      <ChatPanel />
    </>
  );
}
