import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*']
  },
  {
    files: ['firestore.rules', 'DRAFT_firestore.rules'],
    plugins: {
      'firebase-security-rules': firebaseRulesPlugin
    }
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
