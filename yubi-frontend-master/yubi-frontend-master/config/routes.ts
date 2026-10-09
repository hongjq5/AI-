export default [
  {
    path: '/user',
    layout: false,
    routes: [
      { path: '/user/login', component: './User/Login' },
      { path: '/user/register', component: './User/Register' },
    ],
  },
  { path: '/', redirect: '/add_chart_async' },
  { path: '/add_chart_async', name: '新建分析', icon: 'barChart', component: './AddChartAsync' },
  { path: '/my_chart', name: '我的分析', icon: 'pieChart', component: './MyChart' },
  { path: '/add_chart', name: '即时分析', icon: 'lineChart', component: './AddChart' },
  { path: '/guide', name: '使用说明', icon: 'questionCircle', component: './Guide' },
  { path: '*', layout: false, component: './404' },
];
