import { useEffect, useRef, useState, useMemo } from "react";
import { localDataService } from "@/services/localDataService";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload, Trash2, Image as ImageIcon, Plus, Pencil, FolderPlus,
  ChevronLeft, ChevronRight, X, Maximize2, CheckCircle2,
  Images, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// --- TYPES ---
type Category = { id: string; name: string };
type Album = { id: string; category_id: string; name: string; cover_image?: string };
type Photo = { id: string; album_id: string; image_url: string; title?: string };

const Gallery = () => {
  // Data State
  const [categories, setCategories] = useState<Category[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [carouselIndex, setCarouselIndex] = useState<number | null>(null);
  
  // Category Dialog
  const [openCat, setOpenCat] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [catNameInput, setCatNameInput] = useState("");

  // Album Dialog
  const [openAlbum, setOpenAlbum] = useState(false);
  const [editAlbum, setEditAlbum] = useState<Album | null>(null);
  const [albumNameInput, setAlbumNameInput] = useState("");
  const [albumCatInput, setAlbumCatInput] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [cats, albs, phos] = await Promise.all([
        localDataService.getAll("gallery_categories"),
        localDataService.getAll("gallery_albums"),
        localDataService.getAll("gallery_photos")
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setAlbums(Array.isArray(albs) ? albs : []);
      setPhotos(Array.isArray(phos) ? phos : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load gallery data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Sync Dialog Inputs
  useEffect(() => {
    if (editCat) setCatNameInput(editCat.name);
    else setCatNameInput("");
  }, [editCat, openCat]);

  useEffect(() => {
    if (editAlbum) {
      setAlbumNameInput(editAlbum.name);
      setAlbumCatInput(editAlbum.category_id);
    } else {
      setAlbumNameInput("");
      setAlbumCatInput(activeCategory !== "all" ? activeCategory : (categories[0]?.id || ""));
    }
  }, [editAlbum, openAlbum, activeCategory, categories]);

  // --- CATEGORY ACTIONS ---
  const saveCategory = async () => {
    const name = catNameInput.trim();
    if (!name) return;
    try {
      if (editCat) {
        await localDataService.update("gallery_categories", editCat.id, { name });
      } else {
        await localDataService.insert("gallery_categories", { name });
      }
      setOpenCat(false);
      setEditCat(null);
      load();
      toast.success("Category saved");
    } catch (err) {
      toast.error("Failed to save category");
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete category? This will remove all albums and photos inside it!")) return;
    try {
      const catAlbums = albums.filter(a => a.category_id === id);
      for (const a of catAlbums) {
        const albumPhotos = photos.filter(p => p.album_id === a.id);
        for (const p of albumPhotos) {
          await localDataService.delete("gallery_photos", p.id);
        }
        await localDataService.delete("gallery_albums", a.id);
      }
      await localDataService.delete("gallery_categories", id);
      if (activeCategory === id) setActiveCategory("all");
      load();
      toast.success("Category and contents removed");
    } catch (err) {
      toast.error("Failed to delete category");
    }
  };

  // --- ALBUM ACTIONS ---
  const saveAlbum = async () => {
    const name = albumNameInput.trim();
    const catId = albumCatInput;
    if (!name || !catId) return toast.error("Name and Category required");
    
    try {
      if (editAlbum) {
        await localDataService.update("gallery_albums", editAlbum.id, { name, category_id: catId });
      } else {
        await localDataService.insert("gallery_albums", { name, category_id: catId });
      }
      setOpenAlbum(false);
      setEditAlbum(null);
      load();
      toast.success("Album saved");
    } catch (err) {
      toast.error("Failed to save album");
    }
  };

  const deleteAlbum = async (id: string) => {
    if (!confirm("Delete album and all photos?")) return;
    try {
      const albumPhotos = photos.filter(p => p.album_id === id);
      for (const p of albumPhotos) {
        await localDataService.delete("gallery_photos", p.id);
      }
      await localDataService.delete("gallery_albums", id);
      if (selectedAlbum?.id === id) setSelectedAlbum(null);
      load();
      toast.success("Album deleted");
    } catch (err) {
      toast.error("Failed to delete album");
    }
  };

  // --- PHOTO ACTIONS ---
  const uploadPhotos = async (files: FileList | null) => {
    if (!files || !selectedAlbum) return;
    setBusy(true);
    const albumId = selectedAlbum.id;
    
    try {
      for (const file of Array.from(files)) {
        await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const url = e.target?.result as string;
              await localDataService.insert("gallery_photos", {
                album_id: albumId,
                image_url: url,
                title: file.name
              });
              resolve(true);
            } catch (err) { reject(err); }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      
      // Update cover if none exists
      const updatedPhotos = await localDataService.getAll("gallery_photos");
      const currentAlbumPhotos = updatedPhotos.filter((p: any) => p.album_id === albumId);
      if (currentAlbumPhotos.length > 0 && !selectedAlbum.cover_image) {
        await localDataService.update("gallery_albums", albumId, { cover_image: currentAlbumPhotos[0].image_url });
      }
      
      load();
      toast.success("Photos uploaded successfully");
    } catch (err) {
      toast.error("Error uploading photos");
    } finally {
      setBusy(false);
    }
  };

  const deletePhoto = async (id: string) => {
    if (!confirm("Delete photo?")) return;
    try {
      await localDataService.delete("gallery_photos", id);
      load();
      toast.success("Photo deleted");
    } catch (err) {
      toast.error("Failed to delete photo");
    }
  };

  const setAsCover = async (url: string) => {
    if (!selectedAlbum) return;
    try {
      await localDataService.update("gallery_albums", selectedAlbum.id, { cover_image: url });
      load();
      toast.success("Album cover updated");
    } catch (err) {
      toast.error("Failed to update cover");
    }
  };

  // --- FILTERS ---
  const filteredAlbums = useMemo(() => {
    if (activeCategory === "all") return albums;
    return albums.filter(a => a.category_id === activeCategory);
  }, [albums, activeCategory]);

  const albumPhotosList = useMemo(() => {
    if (!selectedAlbum) return [];
    return photos.filter(p => p.album_id === selectedAlbum.id);
  }, [photos, selectedAlbum]);

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading gallery...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Luxury Gallery"
        subtitle="Organize venue photos and event sets into professional categorized albums."
        actions={
          !selectedAlbum && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpenCat(true)}>
                <FolderPlus className="h-4 w-4 mr-2" /> New Category
              </Button>
              <Button onClick={() => setOpenAlbum(true)} className="bg-primary hover:bg-primary/90">
                <Images className="h-4 w-4 mr-2" /> Create Album
              </Button>
            </div>
          )
        }
      />

      <div className="mb-6 flex items-center gap-2">
        {selectedAlbum && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedAlbum(null)} className="font-bold">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Albums
          </Button>
        )}
      </div>

      {!selectedAlbum ? (
        <>
          <Card className="p-3 mb-8 bg-card/50 backdrop-blur-sm border-primary/10 shadow-sm overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-2 min-w-max">
              <Button 
                variant={activeCategory === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveCategory("all")}
                className={activeCategory === "all" ? "bg-primary font-bold shadow-md" : "font-semibold"}
              >
                All Albums
              </Button>
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center group">
                  <Button 
                    variant={activeCategory === cat.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveCategory(cat.id)}
                    className={activeCategory === cat.id ? "bg-primary font-bold shadow-md" : "font-semibold"}
                  >
                    {cat.name}
                  </Button>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditCat(cat); setOpenCat(true); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCategory(cat.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && <span className="text-xs text-muted-foreground ml-4 italic">No categories yet.</span>}
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredAlbums.length === 0 && (
              <div className="col-span-full py-20 text-center text-muted-foreground italic bg-muted/20 rounded-2xl border-2 border-dashed">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-10" />
                No albums found. Click "Create Album" to begin.
              </div>
            )}
            {filteredAlbums.map(album => {
              const count = photos.filter(p => p.album_id === album.id).length;
              return (
                <Card 
                  key={album.id} 
                  className="group relative overflow-hidden border-primary/5 hover:border-primary/40 transition-all cursor-pointer shadow-elegant"
                  onClick={() => setSelectedAlbum(album)}
                >
                  <div className="aspect-[4/5] bg-muted relative">
                    {album.cover_image ? (
                      <img src={album.cover_image} alt={album.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20"><ImageIcon className="h-12 w-12" /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                    <div className="absolute bottom-0 left-0 p-5 w-full text-white">
                      <Badge variant="outline" className="text-[9px] uppercase font-bold mb-2 border-white/40 text-white">
                        {categories.find(c => c.id === album.category_id)?.name || "Uncategorized"}
                      </Badge>
                      <h3 className="text-xl font-display font-bold truncate">{album.name}</h3>
                      <div className="text-xs text-white/60 mt-1 font-semibold">{count} Photos</div>
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                    <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 backdrop-blur" onClick={(e) => { e.stopPropagation(); setEditAlbum(album); setOpenAlbum(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); deleteAlbum(album.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <div className="animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Badge variant="secondary" className="font-bold uppercase tracking-widest text-[9px]">
                  {categories.find(c => c.id === selectedAlbum.category_id)?.name}
                </Badge>
                <h2 className="text-3xl font-display font-bold">{selectedAlbum.name}</h2>
              </div>
              <p className="text-muted-foreground text-sm font-medium">{albumPhotosList.length} photos in this collection</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <input ref={fileRef} type="file" multiple accept="image/*" hidden onChange={(e) => uploadPhotos(e.target.files)} />
              <Button onClick={() => fileRef.current?.click()} disabled={busy} className="bg-primary hover:bg-primary/90 flex-1 md:flex-none">
                <Upload className="h-4 w-4 mr-2" /> {busy ? "Uploading..." : "Add Photos"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {albumPhotosList.length === 0 && (
              <div className="col-span-full py-20 text-center text-muted-foreground italic border-2 border-dashed rounded-2xl">
                This album is currently empty.
              </div>
            )}
            {albumPhotosList.map((photo, idx) => (
              <div key={photo.id} className="group relative aspect-square bg-muted rounded-xl overflow-hidden shadow-sm border border-primary/5 hover:border-primary/40 transition-all">
                <img src={photo.image_url} alt="Gallery" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center" onClick={() => setCarouselIndex(idx)}>
                  <Maximize2 className="h-8 w-8 text-white scale-75 group-hover:scale-100 transition-transform" />
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <Button 
                    variant="secondary" size="icon" className={`h-7 w-7 rounded-full ${selectedAlbum.cover_image === photo.image_url ? "bg-green-600 text-white" : "bg-white/90 text-black"}`} 
                    onClick={() => setAsCover(photo.image_url)} title="Set as album cover"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="destructive" size="icon" className="h-7 w-7 rounded-full" onClick={() => deletePhoto(photo.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- DIALOGS --- */}
      <Dialog open={openCat || !!editCat} onOpenChange={(o) => { if(!o) { setOpenCat(false); setEditCat(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editCat ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label className="text-xs uppercase font-bold text-muted-foreground mb-1.5 block">Category Name</Label>
            <Input value={catNameInput} onChange={(e) => setCatNameInput(e.target.value)} placeholder="e.g. Stage Sets" className="h-12" autoFocus />
          </div>
          <DialogFooter><Button onClick={saveCategory} className="w-full h-11 bg-primary">Save Category</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openAlbum || !!editAlbum} onOpenChange={(o) => { if(!o) { setOpenAlbum(false); setEditAlbum(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editAlbum ? "Modify Album" : "Create New Album"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Album Name</Label>
              <Input value={albumNameInput} onChange={(e) => setAlbumNameInput(e.target.value)} placeholder="e.g. Wedding Setup @ Palace" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Select Category</Label>
              <Select value={albumCatInput} onValueChange={setAlbumCatInput}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Pick Category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button className="w-full h-11 bg-primary" onClick={saveAlbum}>Confirm Album Settings</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- CAROUSEL --- */}
      {carouselIndex !== null && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-in fade-in duration-300">
          <div className="p-6 flex justify-between items-center text-white z-10">
            <div className="font-display font-bold text-lg">{carouselIndex + 1} <span className="opacity-40 mx-2 text-xs">/</span> {albumPhotosList.length}</div>
            <Button variant="ghost" size="icon" onClick={() => setCarouselIndex(null)} className="text-white hover:bg-white/10 rounded-full h-12 w-12">
              <X className="h-8 w-8" />
            </Button>
          </div>
          <div className="flex-1 relative flex items-center justify-center p-4">
            <img src={albumPhotosList[carouselIndex].image_url} alt="Full View" className="max-w-full max-h-full object-contain shadow-2xl transition-all" />
            <button onClick={() => setCarouselIndex(prev => (prev! > 0 ? prev! - 1 : albumPhotosList.length - 1))} className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/5 hover:bg-white/15 backdrop-blur-md p-4 rounded-full text-white transition-all transform hover:scale-110">
              <ChevronLeft className="h-10 w-10" />
            </button>
            <button onClick={() => setCarouselIndex(prev => (prev! < albumPhotosList.length - 1 ? prev! + 1 : 0))} className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/5 hover:bg-white/15 backdrop-blur-md p-4 rounded-full text-white transition-all transform hover:scale-110">
              <ChevronRight className="h-10 w-10" />
            </button>
          </div>
          <div className="h-24 bg-black/50 border-t border-white/5 backdrop-blur flex items-center gap-2 px-6 overflow-x-auto custom-scrollbar">
            {albumPhotosList.map((p, idx) => (
              <div 
                key={p.id} onClick={() => setCarouselIndex(idx)}
                className={`h-16 aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${carouselIndex === idx ? "border-primary scale-110 shadow-lg shadow-primary/20" : "border-transparent opacity-40 hover:opacity-80"}`}
              >
                <img src={p.image_url} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <CarouselKeyboard onPrev={() => setCarouselIndex(prev => (prev! > 0 ? prev! - 1 : albumPhotosList.length - 1))} onNext={() => setCarouselIndex(prev => (prev! < albumPhotosList.length - 1 ? prev! + 1 : 0))} onClose={() => setCarouselIndex(null)} />
        </div>
      )}
    </>
  );
};

const CarouselKeyboard = ({ onPrev, onNext, onClose }: any) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if(e.key==="ArrowLeft")onPrev(); if(e.key==="ArrowRight")onNext(); if(e.key==="Escape")onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onPrev, onNext, onClose]);
  return null;
};

export default Gallery;
