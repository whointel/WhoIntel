module.exports = {
	root: true,
	env: {
		browser: true,
		node: true
	},
	extends: [
		"plugin:vue/essential",
		"eslint:recommended",
		"@vue/typescript/recommended"
	],
	plugins: [
		"vuetify"
	],
	parserOptions: {
		"parser": "@typescript-eslint/parser",
		"ecmaVersion": 2020
	},
	rules: {
		"vuetify/no-deprecated-classes": "error",
		"vuetify/grid-unknown-attributes": "error",
		"vuetify/no-legacy-grid": "off",
		"vue/no-use-v-if-with-v-for": "off",
		"no-debugger": "warn",
		semi: [1, "never"],
		"no-console": "off",
		"no-unused-vars": "off",
		"@typescript-eslint/no-unused-vars": "warn",
		"no-var": "warn",
		"prefer-const": "warn",
		"@typescript-eslint/explicit-module-boundary-types": "off",
		"@typescript-eslint/ban-ts-comment": "off",
		"@typescript-eslint/no-explicit-any": "off",
		indent: ["error", "tab", {SwitchCase: 1}],
		// "no-tabs": ["error", {allowIndentationTabs: true}],
		"no-tabs": "off",
		quotes: [2, "double", {avoidEscape: true}],
		"space-before-function-paren": ["error", {
			anonymous: "always", named: "never", asyncArrow: "always"
		}],
		"object-curly-spacing": ["error", "never"],
		"comma-dangle": ["error", "only-multiline", {
			exports: "never", imports: "never",
		}],
		"no-multiple-empty-lines": "off",
		"padded-blocks": "off",
		"vue/html-indent": ["error", "tab", {
			attribute: 1,
			baseIndent: 1,
			closeBracket: 0,
			alignAttributesVertically: true,
			ignores: []
		}],
		"vue/html-closing-bracket-spacing": ["error", {
			startTag: "never",
			endTag: "never",
			selfClosingTag: "never"
		}],
		"vue/html-closing-bracket-newline": "off",
		"operator-linebreak": ["error", "before"],
		curly: ["error", "multi-line"],
		"object-property-newline": "off",
		"vue/attributes-order": ["error", {
			order: [
				"CONDITIONALS",
				"EVENTS",
				"DEFINITION",
				"LIST_RENDERING",
				"RENDER_MODIFIERS",
				"CONTENT",
				["UNIQUE", "SLOT"],
				"GLOBAL",
				"TWO_WAY_BINDING",
				"OTHER_DIRECTIVES",
				"OTHER_ATTR",
			],
			alphabetical: false
		}],
		"vue/multiline-html-element-content-newline": "off",
		"vue/singleline-html-element-content-newline": "off",
		"vue/max-attributes-per-line": ["error", {
			singleline: {
				max: 7,
				allowFirstLine: true
			},
			multiline: {
				max: 5,
				allowFirstLine: false
			}
		}],
		"no-return-assign": "off",
	}
}
