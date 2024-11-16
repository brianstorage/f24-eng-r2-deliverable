"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// We use zod (z) to define a schema for the "Add species" form.
// zod handles validation of the input values with methods like .string(), .nullable(). It also processes the form inputs with .transform() before the inputs are sent to the database.

// Define kingdom enum for use in Zod schema and displaying dropdown options in the form
const kingdoms = z.enum(["Animalia", "Plantae", "Fungi", "Protista", "Archaea", "Bacteria"]);

// Use Zod to define the shape + requirements of a Species entry; used in form validation
const speciesSchema = z.object({
  scientific_name: z
    .string()
    .trim()
    .min(1)
    .transform((val) => val?.trim()),
  common_name: z
    .string()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  kingdom: kingdoms,
  total_population: z.number().int().positive().min(1).nullable(),
  image: z
    .string()
    .url()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  description: z
    .string()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
});

export default function EditSpeciesDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [speciesList, setSpeciesList] = useState<any[]>([]); // List of species authored by the user
  const [selectedSpecies, setSelectedSpecies] = useState<any | null>(null); // Selected species to edit
  const supabase = createBrowserSupabaseClient();

  const form = useForm<FormData>({
    resolver: zodResolver(speciesSchema),
    defaultValues: {
      scientific_name: "",
      common_name: "",
      kingdom: "Animalia",
      total_population: null,
      image: null,
      description: "",
    },
    mode: "onChange",
  });

  // Fetch species created by the current user
  useEffect(() => {
    async function fetchSpecies() {
      const { data, error } = await supabase.from("species").select("*").eq("author", userId); // Fetch species authored by the user

      if (error) {
        return toast({
          title: "Error fetching species",
          description: error.message,
          variant: "destructive",
        });
      }

      setSpeciesList(data || []); // Set the species list
    }

    fetchSpecies();
  }, [supabase, userId]);

  // Update form values when a species is selected
  useEffect(() => {
    if (selectedSpecies) {
      form.reset({
        scientific_name: selectedSpecies.scientific_name || "",
        common_name: selectedSpecies.common_name || "",
        kingdom: selectedSpecies.kingdom || "Animalia",
        total_population: selectedSpecies.total_population || null,
        image: selectedSpecies.image || null,
        description: selectedSpecies.description || "",
      });
    }
  }, [selectedSpecies, form]);

  const onSubmit = async (input: FormData) => {
    if (!selectedSpecies) {
      return toast({
        title: "No species selected",
        description: "Please select a species to edit.",
        variant: "destructive",
      });
    }

    const { error } = await supabase
      .from("species")
      .update({
        common_name: input.common_name,
        description: input.description,
        kingdom: input.kingdom,
        scientific_name: input.scientific_name,
        total_population: input.total_population,
        image: input.image,
      })
      .eq("id", selectedSpecies.id); // Update the selected species

    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    toast({ title: "Species updated successfully!" });
    setOpen(false);
    window.location.reload(); // Refresh page after successful edit
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Edit Species</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select a Species to Edit</DialogTitle>
        </DialogHeader>

        {/* Species selection dropdown */}
        <Select
          value={selectedSpecies ? selectedSpecies.id : ""}
          onChange={(e) => {
            const selected = speciesList.find((s) => s.id === e.target.value);
            setSelectedSpecies(selected || null);
          }}
          className="mt-2 w-full rounded border p-2"
        >
          <option value="" disabled>
            Select a species
          </option>
          {speciesList.map((species) => (
            <option key={species.id} value={species.id}>
              {species.scientific_name || "Unnamed species"}
            </option>
          ))}
        </Select>

        {selectedSpecies && (
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
            <div>
              <label>Scientific Name</label>
              <Input
                {...form.register("scientific_name")}
                placeholder="Scientific Name"
                className="mt-1 w-full rounded border p-2"
              />
            </div>
            <div>
              <label>Common Name</label>
              <Input
                {...form.register("common_name")}
                placeholder="Common Name"
                className="mt-1 w-full rounded border p-2"
              />
            </div>
            <div>
              <label>Kingdom</label>
              <Input {...form.register("kingdom")} placeholder="Kingdom" className="mt-1 w-full rounded border p-2" />
            </div>
            <div>
              <label>Total Population</label>
              <Input
                type="number"
                {...form.register("total_population")}
                placeholder="Total Population"
                className="mt-1 w-full rounded border p-2"
              />
            </div>
            <div>
              <label>Description</label>
              <textarea
                {...form.register("description")}
                placeholder="Description"
                className="mt-1 h-24 w-full rounded border p-2"
              />
            </div>
            <div>
              <label>Image URL</label>
              <Input {...form.register("image")} placeholder="Image URL" className="mt-1 w-full rounded border p-2" />
            </div>
            <Button type="submit" className="mt-4 w-full">
              Save Changes
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
