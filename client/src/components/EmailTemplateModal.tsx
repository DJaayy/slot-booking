import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomizeEmailTemplate, EmailTemplate } from "@shared/schema";
import { customizeEmailTemplateSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: EmailTemplate | null;
  onSuccess: () => void;
}

export default function EmailTemplateModal({
  isOpen,
  onClose,
  template,
  onSuccess,
}: EmailTemplateModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [variableKeys, setVariableKeys] = useState<string[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [previewBody, setPreviewBody] = useState("");
  const [newVariable, setNewVariable] = useState({ key: "", description: "" });

  const categories = [
    { value: "booking", label: "Booking Confirmation" },
    { value: "status-update", label: "Status Update" },
    { value: "reminder", label: "Deployment Reminder" },
  ];

  // Set up form with validation
  const form = useForm<CustomizeEmailTemplate>({
    resolver: zodResolver(customizeEmailTemplateSchema),
    defaultValues: {
      name: template?.name || "",
      subject: template?.subject || "",
      body: template?.body || "",
      category: (template?.category as any) || "booking",
      variables: template?.variables || {},
      isDefault: template?.isDefault || 0,
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        subject: template.subject,
        body: template.body,
        category: template.category as any,
        variables: template.variables as Record<string, string>,
        isDefault: template.isDefault,
      });

      if (template.variables) {
        setVariableKeys(Object.keys(template.variables as Record<string, string>));
        setVariableValues(template.variables as Record<string, string>);
      }
    } else {
      form.reset({
        name: "",
        subject: "",
        body: "",
        category: "booking",
        variables: {},
        isDefault: 0,
      });
      setVariableKeys([]);
      setVariableValues({});
    }
  }, [template, form]);

  // Update or create email template
  const mutation = useMutation({
    mutationFn: async (data: CustomizeEmailTemplate) => {
      if (template) {
        // Update existing template
        return apiRequest(`/api/email-templates/${template.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        // Create new template
        return apiRequest("/api/email-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: template ? "Template Updated" : "Template Created",
        description: template
          ? "The email template has been updated successfully."
          : "A new email template has been created.",
      });
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${template ? "update" : "create"} email template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // On form submit
  const onSubmit = (data: CustomizeEmailTemplate) => {
    mutation.mutate(data);
  };

  // Handle variable updates
  const addVariable = () => {
    if (!newVariable.key || !newVariable.description) return;
    
    const updatedVariables = {
      ...form.getValues().variables,
      [newVariable.key]: newVariable.description,
    };
    
    form.setValue("variables", updatedVariables);
    setVariableKeys([...variableKeys, newVariable.key]);
    setVariableValues(updatedVariables);
    setNewVariable({ key: "", description: "" });
  };

  const removeVariable = (key: string) => {
    const updatedVariables = { ...form.getValues().variables };
    delete updatedVariables[key];
    
    form.setValue("variables", updatedVariables);
    setVariableKeys(variableKeys.filter(k => k !== key));
    setVariableValues(updatedVariables);
  };

  // Generate preview with placeholders
  useEffect(() => {
    let preview = form.getValues().body || "";
    variableKeys.forEach(key => {
      const regex = new RegExp(`{{${key}}}`, "g");
      preview = preview.replace(regex, `<span class="bg-blue-100 text-blue-800 px-1 rounded">${key}</span>`);
    });
    setPreviewBody(preview);
  }, [form.watch("body"), variableKeys]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Email Template" : "Create Email Template"}</DialogTitle>
          <DialogDescription>
            {template
              ? "Update this template for automated email notifications"
              : "Create a new template for automated email notifications"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter template name" 
                          {...field} 
                          disabled={template?.isDefault === 1}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        disabled={template?.isDefault === 1}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter email subject" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Template Variables</h3>
                  <div className="flex space-x-2">
                    <Input 
                      placeholder="Variable name" 
                      value={newVariable.key}
                      onChange={(e) => setNewVariable({...newVariable, key: e.target.value})}
                    />
                    <Input 
                      placeholder="Description" 
                      value={newVariable.description}
                      onChange={(e) => setNewVariable({...newVariable, description: e.target.value})}
                    />
                    <Button type="button" variant="outline" onClick={addVariable}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {variableKeys.map((key) => (
                      <Badge 
                        key={key} 
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {key}
                        <button 
                          onClick={() => removeVariable(key)}
                          className="ml-1 text-xs bg-muted-foreground/20 rounded-full h-4 w-4 inline-flex items-center justify-center"
                          type="button"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Body</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter email body" 
                          className="min-h-[200px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <h3 className="text-sm font-medium mb-2">Template Preview</h3>
                  <Card>
                    <CardContent className="p-4 prose prose-sm max-w-none">
                      <div className="mt-2 text-sm whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: previewBody }}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : template ? "Update Template" : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}