/**
 * Single source of truth for the logged-out marketing navigation.
 * (NAVIGATION_IA_001 spec — Iteration A.)
 *
 * `NavItemId` is a closed union of every nav link id; the analytics layer
 * imports it so `nav_link_clicked.item` can never drift from the rendered nav.
 * Pure data + types — no 'use client', no React. Safe to import anywhere.
 */

export type NavItemId =
  // top level
  | 'product' | 'pricing' | 'sign_in' | 'start_free'
  // solutions · popular
  | 'sol_operations' | 'sol_compliance' | 'sol_ai'
  // solutions · by role
  | 'sol_role_ops_mgr' | 'sol_role_ba' | 'sol_role_pe' | 'sol_role_revops' | 'sol_role_consultant' | 'sol_role_all'
  // solutions · by department
  | 'sol_dept_finance' | 'sol_dept_operations' | 'sol_dept_it' | 'sol_dept_hr' | 'sol_dept_salesops' | 'sol_dept_all'
  // solutions · by industry
  | 'sol_ind_manufacturing' | 'sol_ind_healthcare' | 'sol_ind_banking' | 'sol_ind_insurance' | 'sol_ind_saas' | 'sol_ind_all'
  // solutions · footer
  | 'sol_compare'
  // resources · templates & guides
  | 'res_workflow_library' | 'res_sop_templates' | 'res_ai_opportunities'
  // resources · software
  | 'res_sw_salesforce' | 'res_sw_netsuite' | 'res_sw_sap' | 'res_sw_servicenow' | 'res_sw_jira' | 'res_sw_all'
  // resources · learn
  | 'res_blog' | 'res_docs' | 'res_howto' | 'res_methodology'
  // resources · company
  | 'res_about' | 'res_security' | 'res_support' | 'res_compare';

export type NavColumnId =
  | 'popular' | 'by_role' | 'by_department' | 'by_industry'
  | 'templates_guides' | 'software' | 'learn' | 'company';

export type NavMenuId = 'solutions' | 'resources';

export interface NavLeaf {
  readonly id: NavItemId;
  readonly label: string;
  readonly href: string;
  readonly badge?: string;
}

export interface NavColumn {
  readonly heading: string;
  readonly column: NavColumnId;
  readonly items: readonly NavLeaf[];
  readonly viewAll?: NavLeaf;
}

export interface NavMenu {
  readonly kind: 'menu';
  readonly id: NavMenuId;
  readonly label: string;
  readonly columns: readonly NavColumn[];
  readonly footerLink?: NavLeaf;
}

export interface NavLinkItem {
  readonly kind: 'link';
  readonly id: NavItemId;
  readonly label: string;
  readonly href: string;
}

export type NavTopItem = NavLinkItem | NavMenu;

const SOLUTIONS: NavMenu = {
  kind: 'menu',
  id: 'solutions',
  label: 'Solutions',
  columns: [
    {
      heading: 'Popular use cases',
      column: 'popular',
      items: [
        { id: 'sol_operations', label: 'Operations teams', href: '/use-cases/operations' },
        { id: 'sol_compliance', label: 'Compliance', href: '/use-cases/compliance' },
        { id: 'sol_ai', label: 'AI implementation', href: '/use-cases/ai-implementation' },
      ],
    },
    {
      heading: 'By role',
      column: 'by_role',
      items: [
        { id: 'sol_role_ops_mgr', label: 'Operations Managers', href: '/use-cases/personas/operations-managers' },
        { id: 'sol_role_ba', label: 'Business Analysts', href: '/use-cases/personas/business-analysts' },
        { id: 'sol_role_pe', label: 'Process Excellence Leads', href: '/use-cases/personas/process-excellence-leads' },
        { id: 'sol_role_revops', label: 'RevOps Managers', href: '/use-cases/personas/revops-managers' },
        { id: 'sol_role_consultant', label: 'Consultants', href: '/use-cases/personas/consultants' },
      ],
      viewAll: { id: 'sol_role_all', label: 'View all roles', href: '/use-cases/personas' },
    },
    {
      heading: 'By department',
      column: 'by_department',
      items: [
        { id: 'sol_dept_finance', label: 'Finance', href: '/departments/finance' },
        { id: 'sol_dept_operations', label: 'Operations', href: '/departments/operations' },
        { id: 'sol_dept_it', label: 'IT', href: '/departments/it' },
        { id: 'sol_dept_hr', label: 'HR', href: '/departments/hr' },
        { id: 'sol_dept_salesops', label: 'Sales Operations', href: '/departments/sales-operations' },
      ],
      viewAll: { id: 'sol_dept_all', label: 'View all departments', href: '/departments' },
    },
    {
      heading: 'By industry',
      column: 'by_industry',
      items: [
        { id: 'sol_ind_manufacturing', label: 'Manufacturing', href: '/industries/manufacturing' },
        { id: 'sol_ind_healthcare', label: 'Healthcare', href: '/industries/healthcare' },
        { id: 'sol_ind_banking', label: 'Banking', href: '/industries/banking' },
        { id: 'sol_ind_insurance', label: 'Insurance', href: '/industries/insurance' },
        { id: 'sol_ind_saas', label: 'SaaS', href: '/industries/saas' },
      ],
      viewAll: { id: 'sol_ind_all', label: 'View all industries', href: '/industries' },
    },
  ],
  footerLink: { id: 'sol_compare', label: 'See how we compare', href: '/comparisons' },
};

const RESOURCES: NavMenu = {
  kind: 'menu',
  id: 'resources',
  label: 'Resources',
  columns: [
    {
      heading: 'Templates & guides',
      column: 'templates_guides',
      items: [
        { id: 'res_workflow_library', label: 'Workflow Library', href: '/workflow-library' },
        { id: 'res_sop_templates', label: 'SOP Templates', href: '/sop-templates' },
        { id: 'res_ai_opportunities', label: 'AI Opportunities', href: '/ai-opportunities', badge: 'New' },
      ],
    },
    {
      heading: 'Software guides',
      column: 'software',
      items: [
        { id: 'res_sw_salesforce', label: 'Salesforce', href: '/software/salesforce' },
        { id: 'res_sw_netsuite', label: 'NetSuite', href: '/software/netsuite' },
        { id: 'res_sw_sap', label: 'SAP', href: '/software/sap' },
        { id: 'res_sw_servicenow', label: 'ServiceNow', href: '/software/servicenow' },
        { id: 'res_sw_jira', label: 'Jira', href: '/software/jira' },
      ],
      viewAll: { id: 'res_sw_all', label: 'View all software', href: '/software' },
    },
    {
      heading: 'Learn',
      column: 'learn',
      items: [
        { id: 'res_blog', label: 'Blog', href: '/blog' },
        { id: 'res_docs', label: 'Docs', href: '/docs' },
        { id: 'res_howto', label: 'How-to guides', href: '/use-cases/problems' },
        { id: 'res_methodology', label: 'How we research this', href: '/methodology' },
      ],
    },
    {
      heading: 'Company',
      column: 'company',
      items: [
        { id: 'res_about', label: 'About', href: '/about' },
        { id: 'res_security', label: 'Security', href: '/security' },
        { id: 'res_support', label: 'Support', href: '/support' },
        { id: 'res_compare', label: 'Compare tools', href: '/comparisons' },
      ],
    },
  ],
};

export const TOP_NAV: readonly NavTopItem[] = [
  { kind: 'link', id: 'product', label: 'Product', href: '/product' },
  SOLUTIONS,
  { kind: 'link', id: 'pricing', label: 'Pricing', href: '/pricing' },
  RESOURCES,
];

/** Pathname prefixes that light up each menu trigger's active state. */
export const MENU_PREFIXES: Record<NavMenuId, readonly string[]> = {
  solutions: ['/use-cases/', '/departments/', '/industries/'],
  resources: [
    '/workflow-library', '/sop-templates', '/ai-opportunities', '/software',
    '/blog', '/docs', '/methodology', '/about', '/security', '/support', '/comparisons',
  ],
};
