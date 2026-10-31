// Chat privado de cache do bot (era a variável CHAT do bot Python).
// O bot envia ali a foto de perfil (send_photo) só para obter o file_id dela, então precisa
// ser um chat onde o bot consiga enviar fotos: normalmente o seu chat privado com o bot
// (abra o bot e mande /start antes) ou um grupo/canal privado onde ele seja membro.
// Aceita o id numérico (ex.: 123456789 ou -1001234567890).
// O runtime serverless não tem variáveis de ambiente, por isso fica aqui, como o
// MINI_APP_URL do abafigurinhas.
export const CACHE_CHAT_ID = '';
