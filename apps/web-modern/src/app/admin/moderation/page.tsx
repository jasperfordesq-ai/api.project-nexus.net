"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
  Textarea,
  Card,
  CardBody,
} from "@heroui/react";
import {
  Shield,
  ChevronLeft,
  AlertCircle,
  Check,
  X,
  Eye,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { AdminProtectedRoute } from "@/components/admin-protected-route";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type AdminPendingListing } from "@/lib/api";

export default function AdminModerationPage() {
  return (
    <AdminProtectedRoute>
      <AdminModerationContent />
    </AdminProtectedRoute>
  );
}

function AdminModerationContent() {
  const { user, logout } = useAuth();
  const [listings, setListings] = useState<AdminPendingListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalType, setModalType] = useState<"view" | "reject" | null>(null);
  const [selectedListing, setSelectedListing] = useState<AdminPendingListing | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPendingListings = async () => {
    setIsLoading(true);
    try {
      const response = await api.adminGetPendingListings();
      setListings(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pending listings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingListings();
  }, []);

  const openViewModal = (listing: AdminPendingListing) => {
    setSelectedListing(listing);
    setModalType("view");
  };

  const openRejectModal = (listing: AdminPendingListing) => {
    setSelectedListing(listing);
    setRejectionReason("");
    setModalType("reject");
  };

  const handleApprove = async (listing: AdminPendingListing) => {
    setIsSubmitting(true);
    try {
      await api.adminApproveListing(listing.id);
      fetchPendingListings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedListing) return;
    setIsSubmitting(true);
    try {
      await api.adminRejectListing(selectedListing.id, rejectionReason);
      setModalType(null);
      fetchPendingListings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button isIconOnly variant="ghost" size="sm">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-orange-400" />
                <h1 className="text-3xl font-bold text-white">Content Moderation</h1>
              </div>
              <p className="text-white/50 mt-1">Review and approve pending listings</p>
            </div>
          </div>
          <Chip color="warning" variant="flat" startContent={<Clock className="w-4 h-4" />}>
            {listings.length} Pending
          </Chip>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
            <Button size="sm" variant="light" onPress={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Pending Listings Table */}
        <GlassCard>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12">
              <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">All caught up!</h3>
              <p className="text-white/50">No listings pending review</p>
            </div>
          ) : (
            <Table
              aria-label="Pending listings table"
              classNames={{
                wrapper: "bg-transparent shadow-none",
                th: "bg-white/5 text-white/70",
                td: "text-white",
              }}
            >
              <TableHeader>
                <TableColumn>LISTING</TableColumn>
                <TableColumn>TYPE</TableColumn>
                <TableColumn>USER</TableColumn>
                <TableColumn>SUBMITTED</TableColumn>
                <TableColumn>ACTIONS</TableColumn>
              </TableHeader>
              <TableBody>
                {listings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{listing.title}</p>
                        <p className="text-white/50 text-sm truncate max-w-xs">
                          {listing.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={listing.type === "offer" ? "success" : "primary"}
                        variant="flat"
                      >
                        {listing.type}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {listing.user?.first_name} {listing.user?.last_name}
                        </p>
                        <p className="text-white/50 text-sm">{listing.user?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-white/70 text-sm">{formatDate(listing.created_at)}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          isIconOnly
                          onPress={() => openViewModal(listing)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          color="success"
                          variant="flat"
                          isIconOnly
                          isLoading={isSubmitting}
                          onPress={() => handleApprove(listing)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          color="danger"
                          variant="flat"
                          isIconOnly
                          onPress={() => openRejectModal(listing)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </GlassCard>
      </div>

      {/* View Modal */}
      <Modal
        isOpen={modalType === "view"}
        onClose={() => setModalType(null)}
        size="2xl"
        classNames={{
          base: "bg-zinc-900 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">Review Listing</ModalHeader>
          <ModalBody>
            {selectedListing && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedListing.title}</h3>
                  <div className="flex gap-2 mt-2">
                    <Chip size="sm" color={selectedListing.type === "offer" ? "success" : "primary"} variant="flat">
                      {selectedListing.type}
                    </Chip>
                    {selectedListing.category && (
                      <Chip size="sm" variant="flat">{selectedListing.category}</Chip>
                    )}
                  </div>
                </div>

                <Card className="bg-white/5 border border-white/10">
                  <CardBody>
                    <p className="text-white/70 whitespace-pre-wrap">{selectedListing.description}</p>
                  </CardBody>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/50 text-sm">Credits</p>
                    <p className="text-white font-medium">{selectedListing.credits_per_hour} / hour</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-sm">Location</p>
                    <p className="text-white font-medium">{selectedListing.location || "Not specified"}</p>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <p className="text-white/50 text-sm">Submitted by</p>
                  <p className="text-white">
                    {selectedListing.user?.first_name} {selectedListing.user?.last_name} ({selectedListing.user?.email})
                  </p>
                  <p className="text-white/50 text-sm mt-1">
                    {formatDate(selectedListing.created_at)}
                  </p>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onPress={() => setModalType(null)}>
              Close
            </Button>
            <Button
              color="danger"
              variant="flat"
              onPress={() => {
                setModalType("reject");
              }}
            >
              Reject
            </Button>
            <Button
              color="success"
              isLoading={isSubmitting}
              onPress={() => {
                if (selectedListing) {
                  handleApprove(selectedListing);
                  setModalType(null);
                }
              }}
            >
              Approve
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={modalType === "reject"}
        onClose={() => setModalType(null)}
        classNames={{
          base: "bg-zinc-900 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">Reject Listing</ModalHeader>
          <ModalBody>
            <p className="text-white/70 mb-4">
              You are about to reject{" "}
              <span className="text-white font-medium">{selectedListing?.title}</span>.
              Please provide a reason:
            </p>
            <Textarea
              label="Rejection Reason"
              placeholder="Explain why this listing is being rejected..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              classNames={{
                input: "text-white",
                inputWrapper: "bg-white/5 border-white/10",
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onPress={() => setModalType(null)}>
              Cancel
            </Button>
            <Button
              color="danger"
              onPress={handleReject}
              isLoading={isSubmitting}
              isDisabled={!rejectionReason.trim()}
            >
              Reject Listing
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
