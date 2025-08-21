export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Xác thực webhook Facebook Messenger
    if (request.method === "GET" && url.pathname === "/webhook") {
      const params = url.searchParams;
      const mode = params.get("hub.mode");
      const token = params.get("hub.verify_token");
      const challenge = params.get("hub.challenge");

      if (mode === "subscribe" && token === env.VERIFY_TOKEN) {
        return new Response(challenge, { status: 200 });
      } else {
        return new Response("Forbidden", { status: 403 });
      }
    }

    // Nhận message từ Facebook Messenger
    if (request.method === "POST" && url.pathname === "/webhook") {
      const body = await request.json();

      if (body.object === "page") {
        for (const entry of body.entry) {
          for (const webhookEvent of entry.messaging) {
            if (webhookEvent.message && webhookEvent.message.text) {
              const userMessage = webhookEvent.message.text;
              const senderId = webhookEvent.sender.id;

              // Gọi Gemini trả lời câu hỏi
              const geminiAnswer = await queryGemini(userMessage, env.GEMINI_API_TOKEN);

              // Gửi câu trả lời lại cho user
              await sendMessage(senderId, geminiAnswer, env.PAGE_ACCESS_TOKEN);
            }
          }
        }
      }
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    return new Response("Hello from Cloudflare Messenger Bot new");
  },
};

// Hàm gửi message trả lời qua Facebook Messenger API
async function sendMessage(senderPsid, message, token) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: senderPsid },
        message: { text: message },
      }),
    }
  );
  return res.json();
}

// Hàm gọi Gemini API lấy câu trả lời với phong cách cố định
async function queryGemini(prompt, geminiApiKey) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  const knowledgeBase = `Đây là các thông tin bạn phải dựa vào khi trả lời:
  "
  Chào mừng bạn đến với Shalom
  "

  Loại áo:
  "
  - Áo thun Cơ Đốc
  - Áo thun Công Ty
  - Áo thun Cá Nhân
  - Áo thun Couple
  - Áo thun Nhóm
  - Áo thun Gia Đình
  - Áo thun Team Building
  - Áo lớp
  - Đồng Phục Mầm Non
  - Áo mùa hè
  - Áo Polo
  Link tham khảo: https://shalom.vn
  "
  
  Màu sắc: 
  "
  Bên mình có rất nhiều màu cho từng loại áo (hơn 20 màu). Bạn có thể tham khảo bảng màu tại đây: https://shalom.vn/bang-mau-ao-thun/
  "
  
  Giá: 
  "
  Để có báo giá tốt nhất, anh/chị vui lòng cho em biết số lượng dự kiến nhé. Vì chi phí sẽ được điều chỉnh dựa trên chất liệu và kiểu in/thêu mà mình lựa chọn ạ.
  "
  
  Size: 
  "
  Bên mình có các size áo thun từ S đến XXL. Dưới đây là kích thước chuẩn của từng size (±1-2cm):
  Size chuẩn (±1-2cm):
  S: ngang 48cm - dài 65cm
  M: ngang 50cm - dài 67cm
  L: ngang 52cm - dài 69cm
  XL: ngang 54cm - dài 71cm
  XXL: ngang 56cm - dài 73cm
  "
  
  Chất liệu: 
  "
  Cotton
  Vải đũi
  AiryCool
  Cá sấu cotton
  Sufa
  Cotton 100%
  Cotton 4c
  Tici
  Cotton 2c
  Cá sấu mè
  Poly Thái
  "
  
  Cách đặt hàng:
  " 
  Q: muốn đặt hàng
  A:
  - Chọn mẫu + màu + size + số lượng 
  - Cung cấp Tên + địa chỉ nhận hàng + số điện thoại
  - Xác nhận đơn, thanh toán cọc 50%
  Q: (khách gửi thông tin đơn hàng: ví dụ "Áo thun, size M, màu đen, 2 cái. Tên: Nam, ĐC: HN, SĐT: 09...")
  A: Cảm ơn bạn đã cung cấp thông tin 💖
  Bên mình đã ghi nhận đơn hàng và sẽ gọi điện xác nhận lại với bạn sớm nhất.
  "
  
  Phí vận chuyển: 
  "
  Nội thành HN/HCM: 25.000 VND
  Liên tỉnh: 35.000-50.000 VND tùy khu vực
  Giao nhanh 1-2 ngày (có phụ thu)
  "
  
  Thanh toán: 
  "
  Nội thành HN/HCM: 25.000 VND
  Liên tỉnh: 35.000-50.000 VND tùy khu vực
  Giao nhanh 1-2 ngày (có phụ thu)
  "
  
  in:         
  "
  - Thêu
  - in lụa
  - In PET
  - Nghệ In Chuyển Nhiệt
  - In Decal
  "
  
  Logo:         
  "
  Q: hỏi tư vấn về logo
  A: bạn đã có logo? hay bạn muốn bên mình thiết kế
  Q: đã có logo 
  A: bạn có thể gửi cho mình logo bạn muốn in
  Q: chưa có logo
  A: bạn có thể cho mình ý tưởng, mình sẽ thiết kế giúp bạn.
  "
  
  Thông tin liên hệ:         
  "
  Fanpage: https://www.facebook.com/profile.php?id=61565282417832
  Zalo: 09.231.294.79
  Tiktok: https://www.tiktok.com/@shalom_uniform
  "
  `;

  // Hướng dẫn cố định cho chatbot
  //Chỉ trả lời dựa trên thông tin đã cho ở trên.
  // Nếu câu hỏi không nằm trong thông tin, thì bạn không cần trả lời
  const instruction = `
  Bạn là chatbot hỗ trợ Facebook Messenger, luôn trả lời bằng tiếng Việt.
  Luôn trả lời đúng 1 câu, ngắn gọn, dễ hiểu, có thể thêm emoji nếu phù hợp.
  `;

  // Ghép thông tin cố định + hướng dẫn + câu hỏi của người dùng
  const finalPrompt = `${knowledgeBase.trim()}\n\n${instruction.trim()}\n\nNgười dùng: ${prompt}\nChatbot:`;

  const payload = {
    contents: [
      {
        parts: [{ text: finalPrompt }],
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return content || "";
  } catch (err) {
    console.error("Gemini API error:", err);
    return "Xin lỗi 😅, hiện tại mình đang gặp sự cố, bạn vui lòng thử lại sau nhé!";
  }
}
