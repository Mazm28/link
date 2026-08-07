import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/* ===========================================================================
 * Boundary enforcement — DEP-1 … DEP-4
 *
 * These are not lint preferences. A `features/` -> `infra/` import is exactly
 * the mistake that silently breaks the Round-2 backend swap: it fails no test,
 * it is invisible in the running app, and it surfaces only when someone tries
 * the swap and discovers a screen is welded to localStorage. Catching it here
 * costs nothing; catching it in Round 2 costs a rewrite.
 *
 * Every rule below is an ERROR, so it fails the build (units-of-work.md 2.4,
 * Units Generation Q6 `A`).
 * =========================================================================== */

const INFRA = ['@infra/**', '**/infra/**', '**/src/infra/**'];
const FEATURES = ['@features/**', '**/features/**'];
const APP = ['@app/**', '**/app/**'];
const UI = ['@ui/**', '**/ui/**'];
const CORE = ['@core/**', '**/core/**'];

/* Physical left/right styling. With logical properties, RTL correctness is the
 * default and a developer has to actively write something wrong to break it.
 * With physical properties it depends on remembering to mirror every value,
 * and one miss reads as an unfinished product to a Persian user (FC-U1-01). */
const PHYSICAL_DIRECTION_CLASS =
  'Literal[value=/(^|\\s)-?(ml|mr|pl|pr|border-l|border-r|rounded-l|rounded-r|text-left|text-right|left|right|float-left|float-right)-/]';

/* Persian characters appearing directly in a component. All copy has to resolve
 * through the catalogue so it can be reviewed and edited in one place
 * (NFR-A5, FC-U1-05). */
const PERSIAN_STRING_LITERAL = 'Literal[value=/[\\u0600-\\u06FF]/]';
const PERSIAN_TEMPLATE_LITERAL = 'TemplateElement[value.raw=/[\\u0600-\\u06FF]/]';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', '**/*.d.ts'] },

  /* ---------------------------------------------------------------- base */
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, __DEV_MENU__: 'readonly' },
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      /* NFR-S2 / SECURITY-13: user-generated content is escaped by React text
       * nodes. This escape hatch is the one way to undo that, so it is banned
       * outright rather than reviewed case by case. */
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message:
            'NFR-S2: dangerouslySetInnerHTML is banned. All user content renders through React text nodes.',
        },
        {
          selector: PHYSICAL_DIRECTION_CLASS,
          message:
            'FC-U1-01: use CSS logical properties (ms-/me-/ps-/pe-/start-/end-/text-start), never physical left/right.',
        },
      ],

      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
    },
  },

  /* ------------------------------------------------------------- DEP-1
   * core/domain is the portable centre of the model. It must be liftable into
   * a Round-2 backend or a React Native app untouched, so it imports nothing
   * from the application at all. */
  {
    files: ['src/core/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                ...APP,
                ...UI,
                ...FEATURES,
                ...INFRA,
                '@core/services/**',
                '@core/repositories/**',
                'react',
                'react-*',
              ],
              message:
                'DEP-1: core/domain imports nothing from the application. It is pure type definitions, portable to a Round-2 backend or React Native untouched.',
            },
          ],
        },
      ],
    },
  },

  /* ------------------------------------------------------------- DEP-2
   * The one that matters most. features/, app/, and ui/ must never reach into
   * infra/. The single exception is app/App.tsx, which is the composition root
   * where the implementation is chosen — see the override below. */
  {
    files: ['src/features/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}', 'src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: INFRA,
              message:
                'DEP-2: only app/App.tsx may import infra/. Everything else goes through RepositoryProvider — that indirection IS NFR-A1.',
            },
          ],
        },
      ],
    },
  },

  /* DEP-2 exception: the composition root. This is the only file in the
   * application permitted to name a concrete repository implementation.
   * See frontend-components.md 4.2. */
  {
    files: ['src/app/App.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },

  /* ------------------------------------------------------------- DEP-3
   * ui/ holds presentational primitives with no business knowledge. Keeping
   * core/ out of them is what lets the same primitives be reused by any unit
   * without dragging domain concepts along. */
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              /* DEP-3, with two NARROW EXCEPTIONS.
               *
               * `@core/rules/jalali` and `@core/rules/persianText` are allowed.
               * They are pure, framework-independent FORMATTING functions with
               * no domain knowledge, and two approved artifacts require the
               * access: frontend-components.md §3.5 places JalaliDatePicker in
               * ui/ while stating its conversion logic must live in
               * core/rules/jalali (so the property tests cover it), and
               * FC-U1-06 requires ui/ primitives to render Persian digits.
               *
               * The alternative — duplicating digit conversion and Jalali
               * arithmetic inside ui/ — would mean two implementations of
               * BR-U1-13, only one of which is property-tested. That is a worse
               * outcome than a documented, narrow exception.
               *
               * Everything DEP-3 actually protects against remains banned:
               * domain types, repositories, services, features, and infra. */
              group: [
                '@core/domain',
                '@core/domain/**',
                '@core/repositories',
                '@core/repositories/**',
                '@core/services/**',
                '@core/reference/**',
                '@core/i18n',
                '@core/i18n/**',
                '@core/errors',
                ...FEATURES,
                ...INFRA,
              ],
              message:
                'DEP-3: ui/ primitives are presentational. Pass data and resolved copy in as props. Only @core/rules/{jalali,persianText} are permitted, as pure formatting helpers.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message: 'NFR-S2: dangerouslySetInnerHTML is banned.',
        },
        {
          selector: PHYSICAL_DIRECTION_CLASS,
          message: 'FC-U1-01: use CSS logical properties, never physical left/right.',
        },
        {
          selector: PERSIAN_STRING_LITERAL,
          message:
            'NFR-A5 / FC-U1-05: no user-facing string literals. Take a catalogue key as a prop and resolve it through t().',
        },
        {
          selector: PERSIAN_TEMPLATE_LITERAL,
          message: 'NFR-A5 / FC-U1-05: no user-facing string literals. Use a catalogue key.',
        },
      ],
    },
  },

  /* ------------------------------------------------------------- DEP-4
   * core/services orchestrates against repository INTERFACES. If a service
   * ever imported a concrete implementation, the Round-2 swap would have to
   * touch business logic rather than one provider. */
  {
    files: ['src/core/services/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [...INFRA, ...FEATURES, ...APP, ...UI],
              message:
                'DEP-4: core/services depends on repository interfaces only — never an implementation, never the UI.',
            },
          ],
        },
      ],
    },
  },

  /* ---------------------------------------------- no Persian in features/app
   * Same rule as ui/, applied to the feature and shell layers. The catalogue
   * (src/core/i18n), the seed data (src/infra/mock/seed.ts) and the reference
   * data (src/core/reference) are where Persian text legitimately lives. */
  {
    files: ['src/features/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message: 'NFR-S2: dangerouslySetInnerHTML is banned.',
        },
        {
          selector: PHYSICAL_DIRECTION_CLASS,
          message: 'FC-U1-01: use CSS logical properties, never physical left/right.',
        },
        {
          selector: PERSIAN_STRING_LITERAL,
          message: 'NFR-A5: user-facing copy belongs in src/core/i18n/fa.ts, resolved by key.',
        },
        {
          selector: PERSIAN_TEMPLATE_LITERAL,
          message: 'NFR-A5: user-facing copy belongs in src/core/i18n/fa.ts, resolved by key.',
        },
      ],
    },
  },

  /* Context modules deliberately export a provider component AND its hook from
   * one file — splitting them would separate a context from the only correct
   * way to read it. Fast refresh is a development convenience; a coherent
   * module boundary is not. */
  {
    files: ['src/app/*Provider.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  /* ------------------------------------------------------------- tests
   * Tests may reach anywhere — that is their job. They may also hold Persian
   * literals, since a test asserting on normalization has to name the exact
   * input it is testing. */
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-syntax': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },

  /* ------------------------------------------------------- config files */
  {
    files: ['*.config.{ts,js}', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
);
