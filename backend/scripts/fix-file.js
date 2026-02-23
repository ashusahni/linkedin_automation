// Node.js script to fix phantombuster.service.js
import fs from 'fs';

const filePath = 'z:/Linkedin_reach/backend/src/services/phantombuster.service.js';

// Read file
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the section
const oldPattern = /\/\/ Parse output to find JSON URL[\s\S]*?return this\.parseResultData\(response\.data\);/;

const newCode = `// Parse output to find CSV URL (contains ALL data, not just new)
      const output = outputData.output;
      const csvUrlMatch = output.match(/CSV saved at (https:\\/\\/[^\\s]+\\.csv)/);
      const jsonUrlMatch = output.match(/JSON saved at (https:\\/\\/[^\\s]+\\.json)/);
      
      // Try CSV first (has all historical data)
      let dataUrl = null;
      let dataType = null;
      
      if (csvUrlMatch) {
        dataUrl = csvUrlMatch[1];
        dataType = 'CSV';
      } else if (jsonUrlMatch) {
        dataUrl = jsonUrlMatch[1];
        dataType = 'JSON';
      }
      
      if (!dataUrl) {
        console.warn("⚠️ No data URL found in output");
        console.log("Output sample:", output.substring(output.length - 500));
        return [];
      }

      console.log(\`📥 Downloading \${dataType} from:\`, dataUrl);

      // Download data from S3
      const response = await axios.get(dataUrl, { 
        timeout: 60000,
        responseType: dataType === 'CSV' ? 'text' : 'json'
      });
      
      console.log("✅ Result data downloaded successfully");
      
      // Parse CSV to JSON if needed
      if (dataType === 'CSV') {
        const csvData = response.data;
        const jsonData = this.parseCSVToJSON(csvData);
        console.log(\`📊 Found \${jsonData.length} records in CSV\`);
        return this.parseResultData(jsonData);
      } else {
        console.log(\`📊 Found \${Array.isArray(response.data) ? response.data.length : 'unknown'} records\`);
        return this.parseResultData(response.data);
      }`;

content = content.replace(oldPattern, newCode);

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ File updated successfully!');
console.log('📝 Changes made to:', filePath);
