import DragBox from 'ol/interaction/DragBox';
import { jsPDF } from 'jspdf';
import { platformModifierKeyOnly } from 'ol/events/condition';
import { showSpinner, hideSpinner, showWarning } from './utils.js';
import { config } from './config.js';

let dragBoxInteraction = null;

function getResolutionScaleFactor() {
  const input = prompt('Select resolution scale: (e.g., 1x for standard (~150 DPI), 2x for high (~300 DPI), 4x for ultra-high (~600 DPI)): ', '2');
  const scaleFactor = parseInt(input, 10);
  if ([1, 2, 4].includes(scaleFactor)) {
    return scaleFactor;
  }
  showWarning('Invalid resolution scale. Defaulting to 2x (~300 DPI).', true);
  return 2; // Default to 2x
}

function exportMap(map, format, filename, extent) {
  showSpinner();
  const scaleFactor = getResolutionScaleFactor();
  const originalSize = map.getSize();
  const originalPixelRatio = window.devicePixelRatio;

  let exportSize = [originalSize[0] * scaleFactor, originalSize[1] * scaleFactor];
  let crop = null;

  window.devicePixelRatio = originalPixelRatio * scaleFactor;
  map.once('rendercomplete', () => {
    const canvas = map.getViewport().querySelector('canvas');
    if (!canvas) {
      showWarning('Failed to export map.', true);
      hideSpinner();
      window.devicePixelRatio = originalPixelRatio;
      return;
    }

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    let exportCanvas = canvas;

    if (extent) {
      const view = map.getView();
      const mapExtent = view.calculateExtent(map.getSize());
      const mapWidth = mapExtent[2] - mapExtent[0];
      const mapHeight = mapExtent[3] - mapExtent[1];

      const x1 = ((extent[0] - mapExtent[0]) / mapWidth) * canvasWidth;
      const y1 = ((mapExtent[3] - extent[3]) / mapHeight) * canvasHeight;
      const x2 = ((extent[2] - mapExtent[0]) / mapWidth) * canvasWidth;
      const y2 = ((mapExtent[3] - extent[1]) / mapHeight) * canvasHeight;

      crop = {
        x: x1,
        y: y1,
        width: (x2 - x1),
        height: (y2 - y1)
      };
      exportSize = [crop.width * scaleFactor, crop.height * scaleFactor];

      exportCanvas = document.createElement('canvas');
      exportCanvas.width = exportSize[0];
      exportCanvas.height = exportSize[1];

      const ctx = exportCanvas.getContext('2d');
      ctx.drawImage(
        canvas,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, exportCanvas.width, exportCanvas.height
      );
    } else {
      exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvasWidth;
      exportCanvas.height = canvasHeight;

      const ctx = exportCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, 0);
    }

    // Load logo
    const logo = new Image();
    logo.src = '/res/nepallogo.png'; // ⚠️ Update this path as needed

    logo.onload = () => {
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = exportCanvas.width;
      finalCanvas.height = exportCanvas.height;

      const ctx = finalCanvas.getContext('2d');

      // Draw white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      // Draw main exportCanvas image
      ctx.drawImage(exportCanvas, 0, 0);

      // Header details
      const headerLines = [
        'Department of Hydrology and Meteorology',
        'Meteorological Forecasting Division',
        'TIA, Kathmandu, Nepal'
      ];

      const padding = 20 * scaleFactor;
      const lineHeight = 16 * scaleFactor;
      const fontSize = 12 * scaleFactor;
      const fontFamily = 'Arial';

      // Draw logo
      const logoWidth = 80 * scaleFactor;
      const logoHeight = 80 * scaleFactor;
      const logoX = padding;
      const logoY = finalCanvas.height - padding - logoHeight - (headerLines.length * lineHeight) - 10 * scaleFactor;
      ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);

      // Draw header lines (bottom-up)
      ctx.fillStyle = 'red';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.font = `${fontSize}px ${fontFamily}`;
      let currentY = finalCanvas.height - padding - lineHeight;
      headerLines.slice().reverse().forEach(line => {
        ctx.fillText(line, padding, currentY);
        currentY -= lineHeight;
      });

      // Draw observation time in black
      let observationTime = document.getElementById('legend-observation-time')?.innerText.trim() || 'N/A';
if (observationTime.toLowerCase().startsWith('observation time:')) {
  observationTime = observationTime.substring('observation time:'.length).trim();
}

      ctx.fillStyle = 'black';
      ctx.fillText(observationTime, padding, finalCanvas.height - padding);

      // Export to format
      try {
        if (format === 'pdf') {
          const pdf = new jsPDF({
            orientation: finalCanvas.width > finalCanvas.height ? 'landscape' : 'portrait',
            unit: 'px',
            format: [finalCanvas.width, finalCanvas.height]
          });
          const imgData = finalCanvas.toDataURL('image/png', 1.0);
          pdf.addImage(imgData, 'PNG', 0, 0, finalCanvas.width, finalCanvas.height);
          
          // Save to database - use direct binary output instead of blob
          try {
            const pdfData = pdf.output('datauristring'); // Get data URI directly
            console.log('PDF data URI length:', pdfData.length);
            console.log('PDF data URI starts with:', pdfData.substring(0, 50));
            
            saveExportToDatabaseDirect(pdfData, filename, 'PDF', extent).then(() => {
              showWarning('PDF saved to database successfully.', false);
            }).catch((error) => {
              console.error('Failed to save PDF to database:', error);
              showWarning('PDF export completed but failed to save to database.', true);
            });
          } catch (error) {
            console.error('Error generating PDF data:', error);
            showWarning('Failed to generate PDF data.', true);
          }
          
          // Also download the PDF
          pdf.save(`${filename}.pdf`);
          showWarning('PDF exported successfully.', false);
        } else {
          const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
          const quality = format === 'jpeg' ? 0.9 : 1.0;
          const dataUrl = finalCanvas.toDataURL(mimeType, quality);
          
          // Save to database
          try {
            saveExportToDatabaseDirect(dataUrl, filename, format.toUpperCase(), extent).then(() => {
              showWarning(`${format.toUpperCase()} saved to database successfully.`, false);
            }).catch((error) => {
              console.error(`Failed to save ${format} to database:`, error);
              showWarning(`${format.toUpperCase()} export completed but failed to save to database.`, true);
            });
          } catch (error) {
            console.error(`Error saving ${format} to database:`, error);
            showWarning(`Failed to save ${format.toUpperCase()} to database.`, true);
          }
          
          // Also download the file
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `${filename}.${format}`;
          link.click();
          showWarning(`${format.toUpperCase()} exported successfully.`, false);
        }
      } catch (err) {
        console.error('Export error:', err);
        showWarning(`Failed to export ${format.toUpperCase()}.`, true);
      }

      window.devicePixelRatio = originalPixelRatio;
      map.setSize(originalSize);
      map.renderSync();
      hideSpinner();
    };

    logo.onerror = () => {
      showWarning('Failed to load logo image.', true);
      window.devicePixelRatio = originalPixelRatio;
      map.setSize(originalSize);
      map.renderSync();
      hideSpinner();
    };
  });

  map.setSize(exportSize);
  map.renderSync();
}

function copyMapToClipboard(map, extent) {
  showSpinner();
  const scaleFactor = getResolutionScaleFactor();
  const originalSize = map.getSize();
  const originalPixelRatio = window.devicePixelRatio;
  let exportSize = [originalSize[0] * scaleFactor, originalSize[1] * scaleFactor];
  let crop = null;

  if (extent) {
    const view = map.getView();
    const mapSize = map.getSize();
    const mapExtent = view.calculateExtent(mapSize);
    const mapWidth = mapExtent[2] - mapExtent[0];
    const mapHeight = mapExtent[3] - mapExtent[1];
    const canvasWidth = mapSize[0];
    const canvasHeight = mapSize[1];

    const x1 = ((extent[0] - mapExtent[0]) / mapWidth) * canvasWidth;
    const y1 = ((mapExtent[3] - extent[3]) / mapHeight) * canvasHeight;
    const x2 = ((extent[2] - mapExtent[0]) / mapWidth) * canvasWidth;
    const y2 = ((mapExtent[3] - extent[1]) / mapHeight) * canvasHeight;

    crop = {
      x: x1 * scaleFactor,
      y: y1 * scaleFactor,
      width: (x2 - x1) * scaleFactor,
      height: (y2 - y1) * scaleFactor
    };
    exportSize = [crop.width, crop.height];
  }

  window.devicePixelRatio = originalPixelRatio * scaleFactor;
  map.once('rendercomplete', () => {
    const canvas = map.getViewport().querySelector('canvas');
    if (!canvas) {
      showWarning('Failed to copy to clipboard.', true);
      hideSpinner();
      window.devicePixelRatio = originalPixelRatio;
      return;
    }

    let exportCanvas = canvas;
    if (crop) {
      exportCanvas = document.createElement('canvas');
      exportCanvas.width = crop.width;
      exportCanvas.height = crop.height;
      const ctx = exportCanvas.getContext('2d');
      ctx.drawImage(canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    }

    exportCanvas.toBlob((blob) => {
      try {
        navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]).then(() => {
          showWarning('Map copied to clipboard as PNG.', false);
        }).catch((err) => {
          console.error('Clipboard error:', err);
          showWarning('Failed to copy to clipboard.', true);
        });
      } catch (err) {
        console.error('Clipboard error:', err);
        showWarning('Failed to copy to clipboard.', true);
      }

      window.devicePixelRatio = originalPixelRatio;
      map.setSize(originalSize);
      map.renderSync();
      hideSpinner();
    }, 'image/png', 1.0);
  });

  map.setSize(exportSize);
  map.renderSync();
}

export function addDragBoxExportInteraction(map, callback) {
  if (dragBoxInteraction) {
    map.removeInteraction(dragBoxInteraction);
  }
  dragBoxInteraction = new DragBox({
    condition: platformModifierKeyOnly
  });

  dragBoxInteraction.on('boxend', () => {
    const extent = dragBoxInteraction.getGeometry().getExtent();
    map.removeInteraction(dragBoxInteraction);
    dragBoxInteraction = null;
    map.getTargetElement().style.cursor = 'default';
    callback(extent);
  });

  dragBoxInteraction.on('boxstart', () => {
    map.getTargetElement().style.cursor = 'crosshair';
  });

  map.addInteraction(dragBoxInteraction);
}

/**
 * Save PDF blob to the database via API
 * @param {Blob} pdfBlob - The PDF blob to save
 * @param {string} filename - The filename for the PDF
 * @param {Array} extent - The map extent (optional)
 */
async function savePDFToDatabase(pdfBlob, filename, extent = null) {
  try {
    console.log('savePDFToDatabase called with blob size:', pdfBlob.size);
    
    // Convert blob to base64
    const base64Data = await blobToBase64(pdfBlob);
    console.log('Base64 data length:', base64Data.length);
    console.log('Base64 data starts with:', base64Data.substring(0, 50));
    
    // Get current observation time
    const observationTimeElement = document.getElementById('observation-time');
    const observationTime = observationTimeElement ? observationTimeElement.value : null;
    
    // Prepare form data
    const formData = new FormData();
    formData.append('pdf_data', base64Data);
    formData.append('level', 'SURFACE'); // Default level
    if (observationTime) {
      formData.append('observation_time', observationTime);
    }
    
    // Send to API
    const normalizedApiBaseUrl = config.apiBaseUrl.endsWith('/') ? config.apiBaseUrl : `${config.apiBaseUrl}/`;
    const apiUrl = `${normalizedApiBaseUrl}api/pdf-export/`;
    console.log('Sending request to:', apiUrl);
    console.log('FormData keys:', Array.from(formData.keys()));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      console.error('Response not ok:', response.status, response.statusText);
      let errorData;
      try {
        errorData = await response.json();
        console.error('Error data from server:', errorData);
      } catch (e) {
        console.error('Could not parse error response as JSON:', e);
        const errorText = await response.text();
        console.error('Error response text:', errorText);
        errorData = { error: errorText || `HTTP ${response.status}` };
      }
      throw new Error(errorData.error || 'Failed to save PDF');
    }
    
    const result = await response.json();
    console.log('PDF saved to database:', result);
    return result;
    
  } catch (error) {
    console.error('Error saving PDF to database:', error);
    throw error;
  }
}

/**
 * Convert blob to base64 string
 * @param {Blob} blob - The blob to convert
 * @returns {Promise<string>} Base64 string
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      console.log('FileReader result type:', typeof reader.result);
      console.log('FileReader result length:', reader.result?.length);
      resolve(reader.result);
    };
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(error);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Save export file data URI directly to the database via API
 * @param {string} fileDataUri - The file data URI
 * @param {string} filename - The filename for the export
 * @param {string} format - The file format (PDF, PNG, JPEG)
 * @param {Array} extent - The map extent (optional)
 */
async function saveExportToDatabaseDirect(fileDataUri, filename, format, extent = null) {
  try {
    console.log(`saveExportToDatabaseDirect called for ${format} with data URI length:`, fileDataUri.length);
    
    // Get current observation time
    const observationTimeElement = document.getElementById('observation-time');
    const observationTime = observationTimeElement ? observationTimeElement.value : null;
    
    // Prepare form data
    const formData = new FormData();
    formData.append('file_data', fileDataUri); // Send data URI directly
    formData.append('format', format); // PDF, PNG, or JPEG
    formData.append('level', 'SURFACE'); // Default level
    if (observationTime) {
      formData.append('observation_time', observationTime);
    }
    
    // Send to API
    const normalizedApiBaseUrl = config.apiBaseUrl.endsWith('/') ? config.apiBaseUrl : `${config.apiBaseUrl}/`;
    const apiUrl = `${normalizedApiBaseUrl}api/export-file/`;
    console.log(`Sending ${format} export request to:`, apiUrl);
    console.log('FormData keys:', Array.from(formData.keys()));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      console.error('Response not ok:', response.status, response.statusText);
      let errorData;
      try {
        errorData = await response.json();
        console.error('Error data from server:', errorData);
      } catch (e) {
        console.error('Could not parse error response as JSON:', e);
        const errorText = await response.text();
        console.error('Error response text:', errorText);
        errorData = { error: errorText || `HTTP ${response.status}` };
      }
      throw new Error(errorData.error || `Failed to save ${format}`);
    }
    
    const result = await response.json();
    console.log(`${format} saved to database:`, result);
    return result;
    
  } catch (error) {
    console.error('Error saving PDF to database:', error);
    throw error;
  }
}

// Keep backward compatibility function
async function savePDFToDatabaseDirect(pdfDataUri, filename, extent = null) {
  return saveExportToDatabaseDirect(pdfDataUri, filename, 'PDF', extent);
}

export { exportMap, copyMapToClipboard, savePDFToDatabase, savePDFToDatabaseDirect, saveExportToDatabaseDirect };
