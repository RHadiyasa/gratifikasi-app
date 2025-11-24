"use client";
import { Card, CardFooter, CardHeader } from "@heroui/card";
import { Image } from "@heroui/image";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Button,
  Input,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";

export const LockIcon = (props) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 24 24"
      width="1em"
      {...props}
    >
      <path
        d="M12.0011 17.3498C12.9013 17.3498 13.6311 16.6201 13.6311 15.7198C13.6311 14.8196 12.9013 14.0898 12.0011 14.0898C11.1009 14.0898 10.3711 14.8196 10.3711 15.7198C10.3711 16.6201 11.1009 17.3498 12.0011 17.3498Z"
        fill="currentColor"
      />
      <path
        d="M18.28 9.53V8.28C18.28 5.58 17.63 2 12 2C6.37 2 5.72 5.58 5.72 8.28V9.53C2.92 9.88 2 11.3 2 14.79V16.65C2 20.75 3.25 22 7.35 22H16.65C20.75 22 22 20.75 22 16.65V14.79C22 11.3 21.08 9.88 18.28 9.53ZM12 18.74C10.33 18.74 8.98 17.38 8.98 15.72C8.98 14.05 10.34 12.7 12 12.7C13.66 12.7 15.02 14.06 15.02 15.72C15.02 17.39 13.67 18.74 12 18.74ZM7.35 9.44C7.27 9.44 7.2 9.44 7.12 9.44V8.28C7.12 5.35 7.95 3.4 12 3.4C16.05 3.4 16.88 5.35 16.88 8.28V9.45C16.8 9.45 16.73 9.45 16.65 9.45H7.35V9.44Z"
        fill="currentColor"
      />
    </svg>
  );
};

const Team = ({ name, imgUrl }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [deskworkPress, setDeskworkPress] = useState(false);

  const [inputUrl, setInputUrl] = useState("");
  const router = useRouter();

  const handlePress = () => {
    onOpen();
    setDeskworkPress(false);
  };

  const handleDeskwork = () => {
    if (deskworkPress) {
      setDeskworkPress(false);
    } else {
      setDeskworkPress(true);
    }
  };

  const openDeskwork = () => {
    if (inputUrl === "123") {
      router.push(`/about/super-admin-${inputUrl}`);
    } else {
      toast.error("Wrong key")
      onClose();
    }
  };
  return (
    <div>
      <ToastContainer />
      <Card
        isFooterBlurred
        className="w-full h-[300px] col-span-12 sm:col-span-5 hover:scale-102"
      >
        <CardHeader className="absolute z-10 top-1 flex-col items-start">
          <p className="text-tiny text-white/60 uppercase font-bold">
            Kelompok Kerja Inspektorat V
          </p>
          <h4 className="text-white font-bold text-2xl">{name}</h4>
        </CardHeader>
        <Image
          removeWrapper
          alt="Card example background"
          className="z-0 w-full h-full brightness-75 scale-125 -translate-y-6 object-cover"
          src={imgUrl}
        />
        <CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
          <div className="flex items-center justify-between gap-5">
            <p className="text-white text-tiny">{name} Management Apps</p>
          </div>
          <Button
            onPress={handlePress}
            className="text-tiny"
            color="primary"
            radius="full"
            size="sm"
          >
            About {name}
          </Button>
        </CardFooter>
      </Card>

      <Modal
        classNames={{
          body: "py-6",
          backdrop: "bg-[#292f46]/70 backdrop-opacity-40",
          base: "border-[#292f46] bg-[#19172c] dark:bg-[#19172c] text-[#a8b0d3]",
          header: "border-b-[1px] border-[#292f46]",
          footer: "border-t-[1px] border-[#292f46]",
          closeButton: "hover:bg-white/5 active:bg-white/10",
        }}
        size="3xl"
        backdrop="blur"
        isOpen={isOpen}
        onClose={onClose}
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              transition: {
                duration: 0.3,
                ease: "easeOut",
              },
            },
            exit: {
              y: -20,
              opacity: 0,
              transition: {
                duration: 0.2,
                ease: "easeIn",
              },
            },
          },
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">{name}</ModalHeader>
              <ModalBody>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Nullam pulvinar risus non risus hendrerit venenatis.
                  Pellentesque sit amet hendrerit risus, sed porttitor quam.
                </p>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Nullam pulvinar risus non risus hendrerit venenatis.
                  Pellentesque sit amet hendrerit risus, sed porttitor quam.
                </p>
                <p>
                  Magna exercitation reprehenderit magna aute tempor cupidatat
                  consequat elit dolor adipisicing. Mollit dolor eiusmod sunt ex
                  incididunt cillum quis. Velit duis sit officia eiusmod Lorem
                  aliqua enim laboris do dolor eiusmod. Et mollit incididunt
                  nisi consectetur esse laborum eiusmod pariatur proident Lorem
                  eiusmod et. Culpa deserunt nostrud ad veniam.
                </p>
              </ModalBody>
              <ModalFooter className="flex flex-col items-end">
                {deskworkPress ? (
                  <div className="flex items-center w-full gap-3 py-5">
                    <Input
                      endContent={
                        <LockIcon className="text-2xl text-default-400 pointer-events-none shrink-0" />
                      }
                      label="Key"
                      placeholder="Enter your key"
                      type="password"
                      variant="flat"
                      size="sm"
                      onChange={(e) => setInputUrl(e.target.value)}
                    />
                    <Button onPress={openDeskwork} color="secondary">
                      Open
                    </Button>
                    <Button onPress={handleDeskwork} color="danger">
                      Close
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button color="danger" variant="light" onPress={onClose}>
                      Close
                    </Button>
                    <Button color="primary" onPress={handleDeskwork}>
                      Akses Deskwork
                    </Button>
                  </div>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default Team;
