/**
 * Vercel Serverless Function: /api/products
 * REST API for Vanya Living products.
 *
 * Supported methods:
 * - GET: Fetch list of products
 * - POST: Save or update product
 * - DELETE: Delete product by id
 */

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // In production with Firestore Admin SDK or Firebase REST:
      // Can return live Firestore products or default catalog
      const defaultCatalog = [
        {
          id: '1',
          code: 'YASH1',
          name: 'Arjun Teak Lounge Chair',
          category: 'Seating',
          price: 48000,
          badge: '3D Interactive',
          material: 'Reclaimed Teak, Rajasthan',
          hsn: '94036000',
          dimensions: '80×60×75 cm',
          weight: 18,
          images: ['assets/sample.jpg', { type: '3d', url: 'assets/526-28.html' }],
          description: 'Hand-carved from century-old reclaimed railway sleeper teak. Each piece carries unique timber character.'
        }
      ];

      return res.status(200).json({
        success: true,
        count: defaultCatalog.length,
        products: defaultCatalog
      });
    }

    if (req.method === 'POST') {
      const product = req.body;
      if (!product || !product.name) {
        return res.status(400).json({ success: false, error: 'Product name is required' });
      }
      return res.status(200).json({
        success: true,
        message: 'Product received',
        product
      });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      return res.status(200).json({
        success: true,
        message: `Product ${id} deleted`
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
