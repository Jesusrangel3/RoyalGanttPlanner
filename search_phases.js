const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'components', 'views', 'GanttView.tsx'), 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('phases') || line.includes('Phases')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
