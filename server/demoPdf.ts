import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function createDemoPdfBuffer(): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Page 1: Executive Summary & RAG Architecture
  const page1 = pdfDoc.addPage([600, 800]);
  page1.drawText('Global AI & RAG Benchmarks Report (2026)', {
    x: 40,
    y: 750,
    size: 20,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.6),
  });

  page1.drawText('Section 1: Executive Summary & Vector Retrieval', {
    x: 40,
    y: 710,
    size: 14,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  const p1Text = [
    'Retrieval-Augmented Generation (RAG) has emerged as the global industry standard',
    'for grounding Large Language Models (LLMs) in verifiable enterprise data.',
    'By retrieving top-k semantic chunks from vector indexes and dense document databases,',
    'RAG architectures reduce factual hallucination rates from 18.4% down to under 1.2%.',
    '',
    'Key RAG System Specifications:',
    '- Chunking Strategy: Hybrid overlapping windows (500 to 1000 characters, 15% overlap).',
    '- Retrieval Accuracy: BM25 combined with Cosine Similarity achieves 94.2% top-3 precision.',
    '- Average Query Latency: 120ms for vector search across 50,000 document pages.',
    '- Context Window Utilization: Optimized context injection reduces token usage by 65%.',
    '',
    'Model Comparison Benchmarks (Page 1):',
    '- Gemini 3.6 Flash: Latency 210ms, Accuracy 98.7%, Context Window 1,000,000 tokens.',
    '- Qwen2.5 1.5B (Local): Latency 380ms (NPU acceleration), Accuracy 89.1%, Local Memory 2.1GB.',
    '- Mixture of Experts (MoE): Active parameters 3.2B out of 14B total, throughput 85 tokens/sec.',
  ];

  let yPos = 670;
  for (const line of p1Text) {
    page1.drawText(line, {
      x: 40,
      y: yPos,
      size: 10,
      font: line.startsWith('-') || line.startsWith('Key') || line.startsWith('Model') ? fontBold : fontRegular,
      color: rgb(0.15, 0.15, 0.15),
    });
    yPos -= 20;
  }

  // Page 2: Hardware Acceleration & Quantization
  const page2 = pdfDoc.addPage([600, 800]);
  page2.drawText('Section 2: Hardware Acceleration & Quantization Metrics', {
    x: 40,
    y: 750,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.6),
  });

  const p2Text = [
    'On-Device and Edge LLM Execution (Qwen2.5 & Local Engines):',
    'Deploying localized LLMs like Qwen2.5 1.5B allows air-gapped security and zero API dependency.',
    'Quantization formats directly impact RAM consumption and generation speed:',
    '',
    '1. FP16 Precision: Memory required 3.2 GB. Full quality retention (100% baseline).',
    '2. INT8 Quantization: Memory required 1.8 GB. Quality retention 99.4%, speed boost +45%.',
    '3. INT4 (Q4_K_M): Memory required 1.1 GB. Quality retention 96.8%, ideal for mobile & edge.',
    '',
    'Hardware Throughput Specs:',
    '- Apple M-Series Unified Memory: 140 GB/s bandwidth, 42 tokens/sec on Qwen2.5 1.5B.',
    '- NVIDIA RTX 4090: 1008 GB/s bandwidth, 165 tokens/sec on Qwen2.5 1.5B.',
    '- Cloud Run Container (Shared CPU): 18.5 tokens/sec with CPU SIMD vector extensions.',
    '',
    'PDF Processing Throughput:',
    'The PDF extraction pipeline processes standard document pages at a speed of 120 pages per second,',
    'generating clean positional page markers and semantic vector embeddings asynchronously.',
  ];

  yPos = 710;
  for (const line of p2Text) {
    page2.drawText(line, {
      x: 40,
      y: yPos,
      size: 10,
      font: line.match(/^\d+\.|^-|Hardware|On-Device|PDF/) ? fontBold : fontRegular,
      color: rgb(0.15, 0.15, 0.15),
    });
    yPos -= 22;
  }

  // Page 3: Enterprise Security & Citations
  const page3 = pdfDoc.addPage([600, 800]);
  page3.drawText('Section 3: Security, Governance & Source Citations', {
    x: 40,
    y: 750,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.6),
  });

  const p3Text = [
    'Data Governance and Citation Transparency:',
    'Enterprise compliance requires that every AI-generated claim must be explicitly backed',
    'by a verifiable source snippet, document filename, and page number.',
    '',
    'Citation Protocol Requirements:',
    '1. Inline Citations: Responses must feature tags like [Global AI Report, Page 2].',
    '2. Excerpt Matching: The verbatim retrieved chunk text must be inspectable in the GUI.',
    '3. Privacy Guarantee: Uploaded PDF documents remain strictly in ephemeral server memory',
    '   and are never stored on persistent public disks without encryption.',
    '',
    'Conclusion & Recommended Operating Parameters:',
    '- Set Top-K Retrieval between 3 and 5 chunks for optimal context density.',
    '- Maintain a similarity threshold of 0.35 to eliminate irrelevant document noise.',
    '- Use Gemini 3.6 Flash when API keys are available for high reasoning accuracy,',
    '  and seamlessly fall back to local Qwen2.5 or extractive RAG when offline.',
  ];

  yPos = 710;
  for (const line of p3Text) {
    page3.drawText(line, {
      x: 40,
      y: yPos,
      size: 10,
      font: line.match(/^\d+\.|^-|Data|Citation|Conclusion/) ? fontBold : fontRegular,
      color: rgb(0.15, 0.15, 0.15),
    });
    yPos -= 22;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
