import { FixDtsDefaultCjsExportsPlugin } from 'fix-dts-default-cjs-exports/rollup'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
  ],
  declaration: true,
  clean: true,
  failOnWarn: false,
  rollup: {
    emitCJS: true,
    inlineDependencies: [
      '@antfu/utils',
    ],
  },
  hooks: {
    'rollup:dts:options': (ctx, options) => {
      // Fix: Ensure declaration files use `export default` instead of `export =`
      // This allows ESM consumers to import named exports alongside the default export
      options.plugins = options.plugins || []
      options.plugins.push(FixDtsDefaultCjsExportsPlugin({
        warn: message => ctx.warnings.add(message),
      }))
    },
  },
})
