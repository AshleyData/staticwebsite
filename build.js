const fs = require('fs');
const path = require('path');
const marked = require('marked');

// Base URL for GitHub Pages
const baseUrl = '/staticwebsite';

// Configure marked to handle relative URLs
marked.use({
    renderer: {
        link(href, title, text) {
            // Only add baseUrl if it's a local path and doesn't already have the baseUrl
            if (href && href.startsWith('/') && !href.startsWith('//') && !href.startsWith(baseUrl)) {
                href = baseUrl + href;
            }
            return `<a href="${href}"${title ? ` title="${title}"` : ''}>${text}</a>`;
        }
    }
});

// Ensure directories exist
const dirs = [
    'public',
    'public/css',
    'public/blog',
    'public/projects'
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

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
    let html = convertMarkdown(content);
    
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : path.basename(filePath, '.md');
    
    // Process templates without running them through markdown
    let processedHeader = header
        .replace(/{{title}}/g, title)
        .replace(/{{baseUrl}}/g, baseUrl);
    
    let processedFooter = footer
        .replace(/{{baseUrl}}/g, baseUrl);
    
    return processedHeader + html + processedFooter;
}

// Process a blog post
function processBlogPost(filePath, previousPost, nextPost) {
    const content = fs.readFileSync(filePath, 'utf-8');
    let html = convertMarkdown(content);
    const metadata = extractMetadata(content);
    
    // Replace kit form placeholder with the actual form
    let kitHtml = kitForm
        .replace(/{{form_id}}/g, kitConfig.form_id)
        .replace(/{{uid}}/g, kitConfig.uid);
    
    let postHtml = blogTemplate
        .replace(/{{title}}/g, metadata.title)
        .replace(/{{date}}/g, metadata.date)
        .replace(/{{author}}/g, metadata.author)
        .replace(/{{categories}}/g, metadata.categories)
        .replace(/{{content}}/g, html)
        .replace(/{{url}}/g, encodeURIComponent(`https://ashleydata.github.io${baseUrl}${filePath.replace('src/content', '')}`))
        .replace('{{> convertkit}}', kitHtml);

    // Add navigation if available
    if (previousPost) {
        postHtml = postHtml.replace('{{#if previousPost}}', '')
            .replace(/{{previousPost.url}}/g, baseUrl + previousPost.url)
            .replace(/{{previousPost.title}}/g, previousPost.title)
            .replace('{{/if}}', '');
    } else {
        postHtml = postHtml.replace(/{{#if previousPost}}.*?{{\/if}}/s, '');
    }

    if (nextPost) {
        postHtml = postHtml.replace('{{#if nextPost}}', '')
            .replace(/{{nextPost.url}}/g, baseUrl + nextPost.url)
            .replace(/{{nextPost.title}}/g, nextPost.title)
            .replace('{{/if}}', '');
    } else {
        postHtml = postHtml.replace(/{{#if nextPost}}.*?{{\/if}}/s, '');
    }

    // Process templates without running them through markdown
    let processedHeader = header
        .replace(/{{title}}/g, metadata.title)
        .replace(/{{baseUrl}}/g, baseUrl);
    
    let processedFooter = footer
        .replace(/{{baseUrl}}/g, baseUrl);
    
    return processedHeader + postHtml + processedFooter;
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
                title: path.basename(blogFiles[index + 1], '.md').replace(/-/g, ' ')
            } : null;

            const nextPost = blogFiles[index - 1] ? {
                url: '/blog/' + blogFiles[index - 1].replace('.md', '.html'),
                title: path.basename(blogFiles[index - 1], '.md').replace(/-/g, ' ')
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