import AdminScreen from "../components/admin-screen";
import type { AdminSearchParams } from "../../lib/admin-page-types";
export default function Page({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  return <AdminScreen section="mix" searchParams={searchParams} />;
}
