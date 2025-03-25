import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EmailTemplate } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import EmailTemplateModal from "@/components/EmailTemplateModal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash, Mail } from "lucide-react";

export default function EmailTemplatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTemplate, setDeleteTemplate] = useState<EmailTemplate | null>(null);

  // Get all email templates
  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
    queryFn: () => apiRequest("/api/email-templates"),
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/email-templates/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: "Template Deleted",
        description: "The email template has been deleted successfully.",
      });
      setDeleteTemplate(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete email template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Group templates by category
  const templatesByCategory = templates.reduce((acc: Record<string, EmailTemplate[]>, template: EmailTemplate) => {
    const category = template.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  // Handle opening the modal for creating or editing
  const handleOpenModal = (template: EmailTemplate | null = null) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  // Handle template deletion
  const handleDeleteTemplate = (template: EmailTemplate) => {
    setDeleteTemplate(template);
  };

  const confirmDelete = () => {
    if (deleteTemplate) {
      deleteMutation.mutate(deleteTemplate.id);
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case "booking":
        return "Booking Confirmation";
      case "status-update":
        return "Status Update";
      case "reminder":
        return "Deployment Reminder";
      default:
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-gray-500">
            Manage notification templates for different deployment events
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <PlusCircle className="w-4 h-4" />
          Create Template
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500" />
        </div>
      ) : (
        <Tabs defaultValue="booking" className="w-full">
          <TabsList className="w-full justify-start mb-8">
            <TabsTrigger value="booking">Booking Confirmation</TabsTrigger>
            <TabsTrigger value="status-update">Status Update</TabsTrigger>
            <TabsTrigger value="reminder">Deployment Reminder</TabsTrigger>
          </TabsList>

          {["booking", "status-update", "reminder"].map((category) => (
            <TabsContent key={category} value={category} className="mt-4">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {templatesByCategory[category]?.map((template) => (
                  <Card key={template.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex justify-between items-start gap-2">
                        <span className="flex-1 truncate">{template.name}</span>
                        {template.isDefault === 1 && (
                          <Badge variant="secondary" className="ml-2">
                            Default
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="line-clamp-1">
                        {template.subject}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-24 overflow-hidden text-sm text-gray-500 whitespace-pre-wrap">
                        {template.body.length > 180
                          ? `${template.body.slice(0, 180)}...`
                          : template.body}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenModal(template)}
                        >
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        {template.isDefault !== 1 && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteTemplate(template)}
                          >
                            <Trash className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))}

                {(!templatesByCategory[category] || templatesByCategory[category].length === 0) && (
                  <Card className="col-span-full p-8 border-dashed">
                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                      <Mail className="h-10 w-10 text-gray-400" />
                      <div>
                        <p className="text-lg font-medium">No templates found</p>
                        <p className="text-sm text-gray-500">
                          Create your first template for {getCategoryTitle(category)} notifications.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleOpenModal()}
                        className="mt-4"
                      >
                        Create Template
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Create/Edit Modal */}
      <EmailTemplateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        template={selectedTemplate}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}