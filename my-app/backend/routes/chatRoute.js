const express = require('express');
const fetch = require('node-fetch');
const ChatMessage = require('../models/Chat');
const Good = require('../models/Good');
const Order = require('../models/Order');

const router = express.Router();

const PRODUCT_QUERY_REGEX = /\b(product|item|good|goods|price|brand|category|stock|available|cost)\b|how much|\b(do\s+(you|u)\s+have)\b|have you got|\bsell\b|\bwhat type of\b/i;
const STOP_WORDS = new Set([
  'what', 'is', 'the', 'for', 'and', 'with', 'that', 'this', 'from', 'are', 'you',
  'your', 'have', 'does', 'can', 'please', 'show', 'me', 'tell', 'about', 'any', 'all',
  'much', 'many', 'price', 'cost', 'products', 'product', 'items', 'item', 'brand',
  'category', 'stock', 'available', 'do', 'we', 'our', 'how', 'of', 'kind', 'kinds',
  'type', 'types', 'sell', 'selling'
]);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function normalizeToken(token) {
  const value = normalizeText(token).trim();
  if (value.length <= 3) return value;
  if (value.endsWith('ies') && value.length > 4) return `${value.slice(0, -3)}y`;
  if (value.endsWith('s') && value.length > 3) return value.slice(0, -1);
  return value;
}

function isProductPriceQuery(message) {
  return PRODUCT_QUERY_REGEX.test(message || '');
}

function extractSearchTerms(message) {
  const terms = normalizeText(message).split(/[^a-z0-9]+/).map((term) => normalizeToken(term)).filter((term) => term.length >= 3 && !STOP_WORDS.has(term));
  return [...new Set(terms)];
}

function productSearchScore(product, terms) {
  const fields = normalizeText(`${product.name} ${product.brand} ${product.category} ${product.description || ''}`).split(/[^a-z0-9]+/).map((token) => normalizeToken(token)).filter(Boolean);
  const tokenSet = new Set(fields);
  return terms.reduce((score, term) => (tokenSet.has(term) ? score + 1 : score), 0);
}

async function findMatchedProducts(message, limit = 10) {
  const terms = extractSearchTerms(message);
  if (terms.length === 0) {
    return [];
  }

  const orConditions = terms.flatMap((term) => {
    const regex = { $regex: escapeRegex(term), $options: 'i' };
    return [{ name: regex }, { brand: regex }, { category: regex }];
  });

  const candidates = await Good.find(
    { $or: orConditions },{ name: 1, price: 1, brand: 1, category: 1, countInStock: 1, rating: 1, description: 1 }).limit(80).lean();

  const minTermMatches = Math.min(2, terms.length);

  return candidates.map((product) => ({ product, score: productSearchScore(product, terms) })).filter((entry) => entry.score >= minTermMatches)
    .sort((a, b) => b.score - a.score).slice(0, limit).map((entry) => entry.product);}

function formatProductRows(products) {
  if (!products.length) {
    return "Sorry, that product is not available in our catalog right now.";
  }

  const lines = products.map((p, index) => {
    const stock = Number.isFinite(Number(p.countInStock)) ? Number(p.countInStock) : 0;
    const rating = p.rating === null || p.rating === undefined ? 'N/A' : p.rating;
    return `${index + 1}. ${p.name} | Brand: ${p.brand} | Price: $${p.price} | Stock: ${stock} | Rating: ${rating}`;
  });
  return ['Here are the matching products from our catalog:', ...lines].join('\n');
}

function extractMentionedProducts(replyText, products) {
  const reply = normalizeText(replyText);
  return products.filter((p) => {
    const name = normalizeText(p.name).trim();
    return name.length > 0 && reply.includes(name);
  });
}

function hasUnknownProductMentions(replyText, allowedProducts, allProducts) {
  const allowedNames = new Set(allowedProducts.map((p) => normalizeText(p.name).trim()));
  const mentioned = extractMentionedProducts(replyText, allProducts);
  return mentioned.some((p) => !allowedNames.has(normalizeText(p.name).trim()));
}

// extract relevant database context
async function getContextFromDatabase(userMessage, userId, userName) {
  try {
    const query = userMessage.toLowerCase();
    let context = '';
    let products = [];
    
    // keyword matching
    if (/product|item|good|price|brand|category|stock|available/.test(query)) {
      const keywords = extractSearchTerms(query);
      if (keywords.length > 0) {
        products = await Good.find(
          {
            $or: [
              { name: { $regex: escapeRegex(keywords[0]), $options: 'i' } },
              { brand: { $regex: escapeRegex(keywords[0]), $options: 'i' } },
              { category: { $regex: escapeRegex(keywords[0]), $options: 'i' } }
            ]
          },
          { name: 1, price: 1, brand: 1, category: 1, countInStock: 1, description: 1, rating: 1 }
        ).limit(50).lean();
      }
    }

    // If no matches fetch top products
    if (products.length === 0) {
      products = await Good.find(
        {},
        { name: 1, price: 1, brand: 1, category: 1, countInStock: 1, description: 1, rating: 1 }
      ).limit(100).lean();
    }

    if (products.length > 0) {
      context += '\n=== Available Products ===\n';
      products.forEach((p) => {
        context += `\n• ${p.name} | Brand: ${p.brand} | Price: $${p.price} | Category: ${p.category} | Stock: ${p.countInStock} | Rating: ${p.rating || 'N/A'}`;
      });
    }

    // Search orders if user asks about keywords
    if (/order|shipping|delivery|status|purchase|payment|refund|damaged|broken|defective/.test(query)) {
      let orders = [];
      
      // Extract specific order ID from message (supports full ObjectId or short display ID)
      const orderIdMatch = userMessage.match(/#?([\dA-Fa-f]{8,24})/);
      if (orderIdMatch) {
        const requestedId = orderIdMatch[1].toLowerCase();
        try {
          // If full ObjectId is provided, query directly.
          if (requestedId.length === 24) {
            const specificOrder = await Order.findById(requestedId)
              .select('_id totalPrice isPaid isDelivered createdAt orderItems')
              .lean();
            if (specificOrder) {
              orders.push(specificOrder);
            }
          }

          // If short display ID is provided (e.g. last 8 chars), match against recent orders.
          if (orders.length === 0 && requestedId.length >= 8) {
            const recentOrders = await Order.find(
              {},
              { _id: 1, totalPrice: 1, isPaid: 1, isDelivered: 1, createdAt: 1, orderItems: 1 }
            ).sort({ createdAt: -1 }).limit(200).lean();

            const matched = recentOrders.find((o) => String(o._id).toLowerCase().endsWith(requestedId));
            if (matched) {
              orders.push(matched);
            }
          }
        } catch (err) {
          console.log('Order ID lookup failed:', err.message);
        }
      }
      
      // Also fetch recent orders by userId/userName if no specific order found
      if (orders.length === 0) {
        const userFilters = [];
        if (userId) userFilters.push({ user: userId });
        if (userName) userFilters.push({ user: userName });

        if (userFilters.length > 0) {
          orders = await Order.find(
            { $or: userFilters },
            { _id: 1, totalPrice: 1, isPaid: 1, isDelivered: 1, createdAt: 1, orderItems: 1 }
          ).sort({ createdAt: -1 })
            .limit(5)
            .lean();
        }
      }

      if (orders.length > 0) {
        context += '\n=== Order Information ===\n';
        orders.forEach((o) => {
          const status = o.isDelivered ? 'Delivered' : o.isPaid ? 'Paid' : 'Pending';
          const displayOrderId = String(o._id).slice(-8).toUpperCase();
          const itemsStr = o.orderItems && o.orderItems.length > 0 
            ? o.orderItems.map(item => `${item.name} (qty: ${item.qty})`).join(', ')
            : 'N/A';
          context += `\n• Order #${displayOrderId} (DB ID: ${o._id}): $${o.totalPrice} (${status}) - ${new Date(o.createdAt).toLocaleDateString()}\n  Items: ${itemsStr}`;
        });
      }
    }

    console.log(`[Chat] Retrieved context (${products.length} products):`, context.slice(0, 200));
    return { context, products };
  } catch (err) {
    console.error('Context fetch error:', err.message);
    return {
      context: 'Note: Unable to fetch product data from database at this moment.',
      products: []
    };
  }
}

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'ecommerce-assistant';

router.post('/', async (req, res) => {
  try {
    const { message, history, sessionId, userId, userName } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const messageQuery = message.toLowerCase();
    const productPriceQuestion = isProductPriceQuery(messageQuery);
    const strictMatchedProducts = productPriceQuestion
      ? await findMatchedProducts(message)
      : [];

   
    if (productPriceQuestion) {
      const deterministicReply = formatProductRows(strictMatchedProducts);
      const intent = 'product_inquiry';
      const keywords = extractSearchTerms(messageQuery).slice(0, 8).join(', ');
      const session = typeof sessionId === 'string' && sessionId.trim() ? sessionId.trim() : 'default';

      await ChatMessage.create([
        {
          sessionId: session,
          userId: userId || null,
          role: 'user',
          content: message,
          intent_classified: intent,
          keywords_extracted: keywords
        },
        {
          sessionId: session,
          userId: userId || null,
          role: 'assistant',
          content: deterministicReply,
          context_retrieved: `matchedProducts:${strictMatchedProducts.length}`
        }
      ]);

      return res.json({ reply: deterministicReply });
    }

    // Fetch relevant database context
    const { context: dbContext, products: contextProducts } = await getContextFromDatabase(message, userId, userName);
    console.log(`[Chat] User message: "${message}"\n[Chat] DB context length: ${dbContext.length}`);

    const safeHistory = Array.isArray(history)
      ? history
          .filter((m) => m && typeof m.content === 'string' && typeof m.role === 'string')
          .slice(-10)
      : [];

    // Build system message with database context
    const systemMessage = {
      role: 'system',
       content: `You are a helpful e-commerce shop assistant. Answer customer questions using the product data below. Be concise and helpful.${dbContext}\n\nAlways reference specific products from the list above when answering about what we have.`
      // content: `You are a helpful e-commerce shop assistant. Answer customer questions using the product data below. Be concise and helpful.${dbContext}\n\nAlways reference specific products from the list above when answering about what we have.\n\nRefund policy instructions (must follow strictly):\n1. If a customer asks for a refund, first ask for the refund reason.\n2. If the reason is product quality related (for example: defective, damaged, broken, wrong quality), ask the customer to provide evidence (photo or video).\n3. If the reason is not related to product quality, clearly tell the customer that the order is not eligible for refund under this policy.`
    };

    const body = {
      model: OLLAMA_MODEL,
      messages: [systemMessage, ...safeHistory, { role: 'user', content: message }],
      stream: false
    };

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text || 'Ollama error' });
    }

    const data = await response.json();
    let reply = data?.message?.content || data?.response || '';

    const hasProductIntent = isProductPriceQuery(messageQuery);
    if (hasProductIntent && contextProducts.length > 0) {
      const allProducts = await Good.find({}, { name: 1 }).lean();
      const unknownMentions = hasUnknownProductMentions(reply, contextProducts, allProducts);
      if (unknownMentions) {
        reply = formatProductRows(contextProducts.slice(0, 10));
      }
    }

    console.log(`[Chat] Ollama reply preview: "${reply.slice(0, 100)}..."`);

    // Classify intent from user message
    const intent = /order|shipping|delivery|status|purchase|payment/.test(messageQuery)
      ? 'order_inquiry'
      : /product|item|good|price|brand|category|stock|available/.test(messageQuery)
      ? 'product_inquiry'
      : 'general_question';

    // Extract keywords
    const keywords = extractSearchTerms(messageQuery).slice(0, 8).join(', ');

    const session = typeof sessionId === 'string' && sessionId.trim() ? sessionId.trim() : 'default';
    await ChatMessage.create([
      { 
        sessionId: session, 
        userId: userId || null,
        role: 'user', 
        content: message,
        intent_classified: intent,
        keywords_extracted: keywords
      },
      { 
        sessionId: session, 
        userId: userId || null,
        role: 'assistant', 
        content: reply,
        context_retrieved: dbContext.slice(0, 500)
      }
    ]);

    return res.json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const sessionId = (req.query.sessionId || 'default').toString();
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const records = await ChatMessage.find({ sessionId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();
    return res.json({ records });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

module.exports = router;
