/**
 * Vercel Serverless Function: /api/drive
 * Scans a Google Drive folder for SolidWorks files (.sldprt, .sldasm, .slddrw), PDFs, and 3D HTML views.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const folderParam = req.query.folderId || (req.body && req.body.folderId);
  const apiKey = req.query.key || (req.body && req.body.key) || process.env.GOOGLE_DRIVE_API_KEY;
  const authHeader = req.headers.authorization || (req.body && req.body.token ? `Bearer ${req.body.token}` : null);

  if (!folderParam) {
    return res.status(400).json({
      success: false,
      error: 'Missing folderId parameter. Provide a Google Drive folder ID or link.'
    });
  }

  // Extract clean folder ID from link or raw ID
  const cleanId = (
    folderParam.match(/folders\/([-\w]{10,})/i) ||
    folderParam.match(/id=([-\w]{10,})/i) ||
    folderParam.match(/d\/([-\w]{10,})/i) ||
    [null, folderParam.trim()]
  )[1];

  try {
    let url = `https://www.googleapis.com/drive/v3/files?q='${encodeURIComponent(cleanId)}'+in+parents+and+trashed=false&fields=nextPageToken,files(id,name,mimeType,webViewLink)&pageSize=1000`;
    if (apiKey && !authHeader) {
      url += `&key=${encodeURIComponent(apiKey)}`;
    }

    const headers = { 'Accept': 'application/json' };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(url, { headers });
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.error ? data.error.message : 'Google Drive API request failed.',
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      folderId: cleanId,
      files: data.files || []
    });
  } catch (err) {
    console.error('Drive API handler error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error scanning Google Drive folder.'
    });
  }
}
