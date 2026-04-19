import createMDX from '@next/mdx';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.WAYPOINT_BASE_PATH ?? '',
  images: { unoptimized: true },
  trailingSlash: true,
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  // transform-core reads schemas/pack.schema.json at module init via
  // readFileSync + path.join(__dirname, '..', '..', '..', 'schemas', ...).
  // When Next bundles the package, __dirname rewrites to the Next chunk dir
  // and the schema lookup fails (ENOENT). Keeping it external preserves the
  // real Node __dirname so the relative path resolves to /waypoint/schemas/.
  // serverExternalPackages alone doesn't win against webpack bundling for
  // workspace (symlinked) deps under output:'export'; the webpack externals
  // override below is what actually keeps the require() native on the server.
  serverExternalPackages: ['@waypoint/transform-core'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      const existing = config.externals ?? [];
      config.externals = [
        ...(Array.isArray(existing) ? existing : [existing]),
        ({ request }, callback) => {
          if (request === '@waypoint/transform-core') {
            return callback(null, 'commonjs @waypoint/transform-core');
          }
          callback();
        },
      ];
    }
    return config;
  },
};

export default withMDX(nextConfig);
