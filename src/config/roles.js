const allRoles = {
  member: ['getUsers', 'addPurchaseOrders', 'getPurchaseOrders', 'getVendors'],
  lead: [
    'getUsers',
    'getCustomers',
    'manageCustomers',
    'manageVendors',
    'getVendors',
    'deletePurchaseOrders',
    'addPurchaseOrders',
    'getPurchaseOrders',
    'updatePurchaseOrders',
  ],
  owner: [
    'getUsers',
    'manageUsers',
    'getCustomers',
    'manageCustomers',
    'manageVendors',
    'getVendors',
    'approvePurchaseOrders',
    'deletePurchaseOrders',
    'addPurchaseOrders',
    'getPurchaseOrders',
    'updatePurchaseOrders',
  ],
  admin: [
    'getUsers',
    'manageUsers',
    'getCustomers',
    'manageCustomers',
    'manageVendors',
    'getVendors',
    'approvePurchaseOrders',
    'deletePurchaseOrders',
    'addPurchaseOrders',
    'getPurchaseOrders',
    'updatePurchaseOrders',
  ],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
