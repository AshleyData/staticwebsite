const fs = require('fs');
const path = require('path');
const marked = require('marked');

// Base URL for GitHub Pages
const baseUrl = '/Static-Site';

// Configure marked to handle relative URLs
marked.use({
    renderer: {
        link(href, title, text) {
            // If it's a relative URL, prefix it with baseUrl
            if (href && href.startsWith('/') && !href.startsWith('//')) {
                href = baseUrl + href;
            }
            return `<a href="${href}"${title ? ` title="${title}"` : ''}>${text}</a>`;
        }
    }
});

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

// Read template parts
const header = fs.readFileSync('src/templates/partials/header.html', 'utf-8');
const footer = fs.readFileSync('src/templates/partials/footer.html', 'utf-8');
const blogTemplate = fs.readFileSync('src/templates/partials/blog-post.html', 'utf-8');
const kitForm = fs.readFileSync('src/templates/partials/kit.html', 'utf-8');

// Kit configuration
const kitConfig = {
    form_id: '7790556', // Replace with your Kit form ID
    uid: 'd51e1bf044'  // Replace with your Kit UID
};

// ConvertKit configuration
const convertkitConfig = {
    form_id: 'YOUR_FORM_ID', // Replace with your ConvertKit form ID
    uid: 'YOUR_UID'         // Replace with your ConvertKit UID
};

// Convert markdown to HTML
function convertMarkdown(markdown) {
    return marked.parse(markdown);
}

// Extract metadata from markdown content
function extractMetadata(content) {
    const metadata = {
        title: '',
        date: '',
        author: 'Ashley Stirrup',
        categories: '',
    };

    // Extract title from first heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
        metadata.title = titleMatch[1];
    }

    // Extract date from italicized text
    const dateMatch = content.match(/\*(.+?)\*/);
    if (dateMatch) {
        metadata.date = dateMatch[1];
    }

    return metadata;
}

// Process a regular page
function processPage(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const html = convertMarkdown(content);
    
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : path.basename(filePath, '.md');
    
    return header
        .replace('{{title}}', title)
        .replace(/{{baseUrl}}/g, baseUrl) + 
        html + 
        footer.replace(/{{baseUrl}}/g, baseUrl);
}

// Process a blog post
function processBlogPost(filePath, previousPost, nextPost) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const html = convertMarkdown(content);
    const metadata = extractMetadata(content);
    
    // Replace kit form placeholder with the actual form
    let kitHtml = kitForm
        .replace(/{{form_id}}/g, kitConfig.form_id)
        .replace(/{{uid}}/g, kitConfig.uid);
    
    let postHtml = blogTemplate
        .replace('{{title}}', metadata.title)
        .replace('{{date}}', metadata.date)
        .replace('{{author}}', metadata.author)
        .replace('{{categories}}', metadata.categories)
        .replace('{{content}}', html)
        .replace('{{url}}', encodeURIComponent(baseUrl + filePath.replace('src/content', '')))
        .replace('{{> convertkit}}', kitHtml);

    // Add navigation if available
    if (previousPost) {
        postHtml = postHtml.replace('{{#if previousPost}}', '')
            .replace('{{previousPost.url}}', baseUrl + previousPost.url)
            .replace('{{previousPost.title}}', previousPost.title)
            .replace('{{/if}}', '');
    } else {
        postHtml = postHtml.replace(/{{#if previousPost}}.*?{{\/if}}/s, '');
    }

    if (nextPost) {
        postHtml = postHtml.replace('{{#if nextPost}}', '')
            .replace('{{nextPost.url}}', baseUrl + nextPost.url)
            .replace('{{nextPost.title}}', nextPost.title)
            .replace('{{/if}}', '');
    } else {
        postHtml = postHtml.replace(/{{#if nextPost}}.*?{{\/if}}/s, '');
    }

    return header
        .replace('{{title}}', metadata.title)
        .replace(/{{baseUrl}}/g, baseUrl) + 
        postHtml + 
        footer.replace(/{{baseUrl}}/g, baseUrl);
}

// Build all markdown files
function buildSite() {
    const contentDir = 'src/content';
    const files = fs.readdirSync(contentDir);
    
    // Build regular pages
    files.forEach(file => {
        if (file.endsWith('.md')) {
            const filePath = path.join(contentDir, file);
            const outputPath = path.join('public', file.replace('.md', '.html'));
            
            const html = processPage(filePath);
            fs.writeFileSync(outputPath, html);
            console.log(`Built: ${file} -> ${path.basename(outputPath)}`);
        }
    });
    
    // Build blog posts
    const blogDir = path.join(contentDir, 'blog');
    if (fs.existsSync(blogDir)) {
        const blogFiles = fs.readdirSync(blogDir)
            .filter(file => file.endsWith('.md') && file !== 'index.md')
            .sort((a, b) => b.localeCompare(a)); // Sort reverse chronologically

        blogFiles.forEach((file, index) => {
            const filePath = path.join(blogDir, file);
            const outputPath = path.join('public/blog', file.replace('.md', '.html'));
            
            const previousPost = blogFiles[index + 1] ? {
                url: '/blog/' + blogFiles[index + 1].replace('.md', '.html'),
                title: path.basename(blogFiles[index + 1], '.md')
            } : null;

            const nextPost = blogFiles[index - 1] ? {
                url: '/blog/' + blogFiles[index - 1].replace('.md', '.html'),
                title: path.basename(blogFiles[index - 1], '.md')
            } : null;

            const html = processBlogPost(filePath, previousPost, nextPost);
            fs.writeFileSync(outputPath, html);
            console.log(`Built: blog/${file} -> blog/${path.basename(outputPath)}`);
        });

        // Build blog index separately
        if (fs.existsSync(path.join(blogDir, 'index.md'))) {
            const indexPath = path.join(blogDir, 'index.md');
            const outputPath = path.join('public/blog', 'index.html');
            const html = processPage(indexPath);
            fs.writeFileSync(outputPath, html);
            console.log('Built: blog/index.md -> blog/index.html');
        }
    }
}

buildSite();
console.log('Site built successfully!'); 