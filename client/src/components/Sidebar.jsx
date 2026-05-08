import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Briefcase,
  BarChart2,
  Menu,
  ChevronLeft,
  Wallet,
  MapPin,
  Receipt,
  Landmark,
  CheckSquare,
  FileStack,
  IndianRupee,
  Plus,
} from "lucide-react";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === "s") toggleSidebar();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const menuItems = [
    { path: "/", name: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { path: "/crm", name: "CRM", icon: <Users size={20} /> },
    {
      path: "/quotations",
      name: "Quotations",
      icon: <ClipboardList size={20} />,
      canAdd: true,
    },

    { type: "header", name: "FINANCE" },
    {
      path: "/billing",
      name: "Billing",
      icon: <FileText size={20} />,
      canAdd: true,
    },
    { path: "/invoices", name: "History", icon: <FileStack size={20} /> },
    {
      path: "/receipts",
      name: "Payment Receipts",
      icon: <Receipt size={20} />,
    },
    { path: "/expenses", name: "Expenses", icon: <Receipt size={20} /> },
    { path: "/accounts", name: "Accounts", icon: <Landmark size={20} /> },

    { type: "header", name: "PROJECTS" },
    { path: "/sites", name: "Sites Profiles", icon: <MapPin size={20} /> },

    { type: "header", name: "HUMAN RESOURCES" },
    { path: "/employees", name: "Employees", icon: <Briefcase size={20} /> },
    { path: "/attendance", name: "Attendance", icon: <MapPin size={20} /> },
    { path: "/salary", name: "Payroll", icon: <Wallet size={20} /> },
    { path: "/reports", name: "Reports", icon: <BarChart2 size={20} /> },
  ];

  return (
    <nav
      className={`${
        isOpen ? "w-64" : "w-20"
      } bg-slate-900 text-white flex flex-col h-screen transition-all duration-300 relative shadow-xl flex-shrink-0`}
    >
      {/* Header */}
      <div
        onClick={toggleSidebar}
        className="py-5 px-4 flex items-center cursor-pointer group hover:bg-slate-800 transition border-b border-slate-800"
        title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        <div
          className={`flex items-center gap-3 ${!isOpen ? "justify-center w-full" : ""}`}
        >
          <div className="text-blue-400 flex-shrink-0">
            {isOpen ? <ChevronLeft size={22} /> : <Menu size={22} />}
          </div>
          {isOpen && (
            <div>
              <h2 className="text-base font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent whitespace-nowrap leading-tight">
                Mona Interior
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Studio CRM
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ul className="space-y-0.5 flex-1 overflow-y-auto py-3 px-2">
        {menuItems.map((item, index) => {
          if (item.type === "header") {
            return isOpen ? (
              <li key={index} className="px-3 pt-5 pb-2">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  {item.name}
                </span>
              </li>
            ) : (
              <li key={index} className="h-px bg-slate-800 my-3 mx-2" />
            );
          }

          const isActive = location.pathname === item.path;
          return (
            <li key={item.path} className="relative group/nav-item">
              <Link
                to={item.path}
                title={!isOpen ? item.name : ""}
                className={`flex items-center ${
                  isOpen ? "justify-start gap-3 px-3" : "justify-center px-2"
                } py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {isOpen && (
                  <span className="font-semibold whitespace-nowrap text-sm">
                    {item.name}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Bottom Brand */}
      {isOpen && (
        <div className="p-4 border-t border-slate-800">
          <p className="text-[10px] text-slate-600 text-center font-bold uppercase tracking-widest">
            © 2026 Mona Interior
          </p>
        </div>
      )}
    </nav>
  );
};

export default Sidebar;
