const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Good = require('../models/Good');

function toIdString(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function selectDiversified(products, itemCount) {
  const selected = [];
  const selectedIds = new Set();
  const selectedCategories = new Set();

  for (const p of products) {
    const id = toIdString(p._id);
    const category = p.category || 'Uncategorized';
    if (!selectedCategories.has(category) && !selectedIds.has(id)) {
      selected.push(p);
      selectedIds.add(id);
      selectedCategories.add(category);
    }
    if (selected.length >= itemCount) return selected;
  }

  for (const p of products) {
    const id = toIdString(p._id);
    if (!selectedIds.has(id)) {
      selected.push(p);
      selectedIds.add(id);
    }
    if (selected.length >= itemCount) break;
  }

  return selected;
}

function selectBalancedForUser(products, itemCount, dominantCategory, dominantShare) {
  if (!dominantCategory) return selectDiversified(products, itemCount);

  let maxFromDominant = 1;
  if (dominantShare >= 0.5 && itemCount >= 3) {
    maxFromDominant = 2;
  }
  const selected = [];
  const selectedIds = new Set();
  const selectedCategories = new Set();
  let dominantCount = 0;

  // Pass 1: keep strong preference signal (e.g., Footwear) without full domination
  for (const p of products) {
    if ((p.category || 'Uncategorized') !== dominantCategory) continue;
    const id = toIdString(p._id);
    if (!selectedIds.has(id) && dominantCount < maxFromDominant) {
      selected.push(p);
      selectedIds.add(id);
      selectedCategories.add(p.category || 'Uncategorized');
      dominantCount += 1;
    }
    if (selected.length >= itemCount) return selected;
  }

  // Pass 2: add different categories for variety
  for (const p of products) {
    const id = toIdString(p._id);
    const category = p.category || 'Uncategorized';
    if (!selectedIds.has(id) && !selectedCategories.has(category)) {
      selected.push(p);
      selectedIds.add(id);
      selectedCategories.add(category);
    }
    if (selected.length >= itemCount) return selected;
  }

  // Pass 3: fill remainder by score order
  for (const p of products) {
    const id = toIdString(p._id);
    if (!selectedIds.has(id)) {
      selected.push(p);
      selectedIds.add(id);
    }
    if (selected.length >= itemCount) break;
  }

  return selected;
}

async function getUserPurchaseSignals(userId) {
  const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }).lean();
  if (!orders.length) {
    return {
      purchasedGoodIds: new Set(),
      preferredCategories: new Set(),
      preferredBrands: new Set(),
      avgPrice: 0
    };
  }

  const identifiers = new Set();
  orders.forEach((order) => {
    if (!Array.isArray(order.orderItems)) return;
    order.orderItems.forEach((item) => {
      const id = toIdString(item && item.itemid);
      if (id) identifiers.add(id);
    });
  });

  const idList = Array.from(identifiers);
  const objectIdLike = idList.filter((id) => /^[a-fA-F0-9]{24}$/.test(id));
  const goods = await Good.find({
    $or: [{ itemid: { $in: idList } }, { _id: { $in: objectIdLike } }]
  }).lean();

  const goodsByItemId = new Map();
  const goodsById = new Map();
  goods.forEach((g) => {
    goodsByItemId.set(toIdString(g.itemid), g);
    goodsById.set(toIdString(g._id), g);
  });

  const categoryWeights = {};
  const brandWeights = {};
  let weightedPriceSum = 0;
  let weightSum = 0;
  const purchasedGoodIds = new Set();

  orders.forEach((order, index) => {
    const recencyWeight = Math.exp(-0.6 * index);
    if (!Array.isArray(order.orderItems)) return;
    order.orderItems.forEach((item) => {
      const id = toIdString(item && item.itemid);
      const good = goodsByItemId.get(id) || goodsById.get(id);
      if (!good) return;
      let qty = 1;
      if (item && item.qty) {
        qty = Number(item.qty);
      }
      qty = Math.max(1, qty);
      const qtyWeight = Math.min(qty, 4);
      const combinedWeight = recencyWeight * qtyWeight;
      const goodId = toIdString(good._id);
      purchasedGoodIds.add(goodId);

      categoryWeights[good.category] = (categoryWeights[good.category] || 0) + combinedWeight;
      brandWeights[good.brand] = (brandWeights[good.brand] || 0) + combinedWeight;
      weightedPriceSum += Number(good.price || 0) * combinedWeight;
      weightSum += combinedWeight;
    });
  });

  const preferredCategories = new Set(
    Object.entries(categoryWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name)
  );
  const preferredBrands = new Set(
    Object.entries(brandWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name)
  );

  const sortedCategoryWeights = Object.entries(categoryWeights).sort((a, b) => b[1] - a[1]);
  const dominantCategory = sortedCategoryWeights[0]?.[0] || null;
  const totalCategoryWeight = sortedCategoryWeights.reduce((sum, [, w]) => sum + Number(w || 0), 0);
  let dominantCategoryShare = 0;
  if (totalCategoryWeight > 0) {
    dominantCategoryShare = Number(sortedCategoryWeights[0]?.[1] || 0) / totalCategoryWeight;
  }

  let avgPrice = 0;
  if (weightSum > 0) {
    avgPrice = weightedPriceSum / weightSum;
  }

  return {
    purchasedGoodIds,
    preferredCategories,
    preferredBrands,
    avgPrice,
    dominantCategory,
    dominantCategoryShare
  };
}

function scoreCandidate(signal, product) {
  const inPreferredCategory = signal.preferredCategories.has(product.category);
  const inPreferredBrand = signal.preferredBrands.has(product.brand);
  const priceDiff = Math.abs(Number(product.price || 0) - signal.avgPrice);
  let priceScore = 0.5;
  if (signal.avgPrice > 0) {
    priceScore = Math.max(0, 1 - priceDiff / Math.max(signal.avgPrice, 1));
  }
  const popularityScore = Math.min((Number(product.rating || 0) / 5) * 0.7 + (Number(product.numReviews || 0) / 300) * 0.3, 1);

  let categoryWeight = 0.2;
  if (inPreferredCategory) {
    categoryWeight = 1;
  }

  let brandWeight = 0.2;
  if (inPreferredBrand) {
    brandWeight = 1;
  }

  return 0.45 * categoryWeight + 0.2 * brandWeight + 0.2 * priceScore + 0.15 * popularityScore;
}

async function hybridRecommendation(userId, itemCount = 5) {
  const signal = await getUserPurchaseSignals(userId);
  const poolLimit = Math.max(itemCount * 20, 200);
  const allProducts = await Good.find({}).sort({ rating: -1, numReviews: -1 }).limit(poolLimit).lean();

  // New users: diversified popular picks
  if (signal.purchasedGoodIds.size === 0) {
    return selectDiversified(allProducts, itemCount);
  }

  const scored = allProducts
    .filter((p) => !signal.purchasedGoodIds.has(toIdString(p._id)))
    .map((p) => ({ ...p, finalScore: scoreCandidate(signal, p) }))
    .sort((a, b) => b.finalScore - a.finalScore);

  return selectBalancedForUser(
    scored,
    itemCount,
    signal.dominantCategory,
    signal.dominantCategoryShare
  ).map((p) => ({
    _id: p._id,
    itemid: p.itemid,
    name: p.name,
    price: p.price,
    brand: p.brand,
    category: p.category,
    countInStock: p.countInStock,
    rating: p.rating,
    description: p.description,
    imageUrl: p.imageUrl,
    finalScore: p.finalScore
  }));
}

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '5', 10), 20);
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const recommendations = await hybridRecommendation(userId, limit);
    return res.json({ recommendations });
  } catch (err) {
    console.error('Recommendation error:', err.message);
    return res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

module.exports = router;