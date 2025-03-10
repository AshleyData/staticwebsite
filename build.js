const fs = require('fs');
const path = require('path');
const marked = require('marked');

// Ensure directories exist
if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
}
if (!fs.existsSync('public/css')) {
    fs.mkdirSync('public/css');
}
if (!fs.existsSync('public/blog')) {
    fs.mkdirSync('public/blog');
}

// Copy CSS
fs.copyFileSync('src/css/style.css', 'public/css/style.css');

// Read template
const template = fs.readFileSync('src/templates/base.html', 'utf-8');

// Convert markdown to HTML
function convertMarkdown(markdown) {
    return marked.parse(markdown);
}

// Process a markdown file
function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const html = convertMarkdown(content);
    
    // Get title from first heading or use filename
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : path.basename(filePath, '.md');
    
    // Replace template placeholders
    return template
        .replace('{{title}}', title)
        .replace('{{content}}', html);
}

// Build all markdown files
function buildSite() {
    const contentDir = 'src/content';
    const files = fs.readdirSync(contentDir);
    
    files.forEach(file => {
        if (file.endsWith('.md')) {
            const filePath = path.join(contentDir, file);
            const outputPath = path.join('public', file.replace('.md', '.html'));
            
            const html = processFile(filePath);
            fs.writeFileSync(outputPath, html);
            console.log(`Built: ${file} -> ${path.basename(outputPath)}`);
        }
    });
    
    // Build blog posts if they exist
    const blogDir = path.join(contentDir, 'blog');
    if (fs.existsSync(blogDir)) {
        const blogFiles = fs.readdirSync(blogDir);
        blogFiles.forEach(file => {
            if (file.endsWith('.md')) {
                const filePath = path.join(blogDir, file);
                const outputPath = path.join('public/blog', file.replace('.md', '.html'));
                
                const html = processFile(filePath);
                fs.writeFileSync(outputPath, html);
                console.log(`Built: blog/${file} -> blog/${path.basename(outputPath)}`);
            }
        });
    }
}

buildSite();
console.log('Site built successfully!'); 