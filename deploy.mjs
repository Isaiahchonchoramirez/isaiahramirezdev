// deploy.mjs
import ghpages from 'gh-pages';

ghpages.publish(
  'dist',
  {
    branch: 'gh-pages',
    repo: 'https://github.com/Isaiahchonchoramirez/isaiahramirezdev.git',
    message: '🎯 Manual deploy',
  },
  function (err) {
    if (err) {
      console.error('❌ Deployment failed:', err);
    } else {
      console.log('✅ Successfully deployed!');
    }
  }
);
