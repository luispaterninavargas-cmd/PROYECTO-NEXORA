function StoreIcon({ name }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    heart: <path d="M20.8 8.8c0 5.1-8.8 10.2-8.8 10.2S3.2 13.9 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z" />,
    cart: <><path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L20.5 8H6" /><circle cx="9" cy="19" r="1.2" /><circle cx="17" cy="19" r="1.2" /></>,
    user: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>,
    warning: <><path d="M10.3 3.9 2.4 17.6a1.7 1.7 0 0 0 1.5 2.5h16.2a1.7 1.7 0 0 0 1.5-2.5L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 16.5h.01" /></>,
    sales: <><path d="M3 18V6m0 12h18" /><path d="m5 14 5-5 3 3 6-7" /><path d="M14 5h5v5" /></>,
    package: <><path d="m12 3 8.5 4.5v9L12 21l-8.5-4.5v-9L12 3Z" /><path d="m3.5 7.5 8.5 4.7 8.5-4.7M12 12.2V21M8 5.1l8.5 4.7" /></>,
    orders: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  };

  return <svg className={`store-icon store-icon-${name}`} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default StoreIcon;
