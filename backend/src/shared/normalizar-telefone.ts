export function normalizarTelefone(telefone: string): string {
  let digitos = telefone.replace(/\D/g, "");

  // remove código do país 55 se o número tiver mais de 11 dígitos
  if (digitos.length > 11 && digitos.startsWith("55")) {
    digitos = digitos.slice(2);
  }

  // WhatsApp só opera com celulares no Brasil.
  // Números de 10 dígitos são o formato antigo (pré-2012): DDD + 8 dígitos.
  // O 9 extra é inserido após o DDD para converter ao formato atual de 11 dígitos.
  if (digitos.length === 10) {
    digitos = digitos.slice(0, 2) + "9" + digitos.slice(2);
  }

  return digitos;
}
